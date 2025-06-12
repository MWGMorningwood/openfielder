import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { geocodingService } from '../services/geocodingService';
import type { Address } from '../types';

interface GeocodeRequest {
  address: Address | string;
}

export async function geocode(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('🔍 Geocoding function processed a request.');

  try {
    // Parse request body
    const body = await request.text();
    context.log('📋 Request body received:', body);
    
    if (!body) {
      context.log('❌ No request body provided');
      return {
        status: 400,
        jsonBody: { error: 'Request body is required' }
      };
    }

    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
      context.log('✅ Successfully parsed JSON:', parsedBody);
    } catch (parseError) {
      context.log('❌ JSON parse error:', parseError);
      return {
        status: 400,
        jsonBody: { error: 'Invalid JSON in request body' }
      };
    }

    const { address }: GeocodeRequest = parsedBody;
    context.log('📍 Address from request:', address);

    if (!address) {
      return {
        status: 400,
        jsonBody: { error: 'Address is required' }
      };
    }

    // Handle both string and object addresses
    let addressObj: Address;
    if (typeof address === 'string') {
      // Parse string address format: "street, city, state zipcode"
      const parts = address.split(',').map(p => p.trim());
      if (parts.length < 3) {
        return {
          status: 400,
          jsonBody: { error: 'Address string must be in format: "street, city, state zipcode"' }
        };
      }
      
      const lastPart = parts[parts.length - 1];
      const stateZipMatch = lastPart.match(/^(.+?)\s+(\d{5}(?:-\d{4})?)$/);
      if (!stateZipMatch) {
        return {
          status: 400,
          jsonBody: { error: 'Invalid state and zip code format' }
        };
      }

      addressObj = {
        street1: parts.slice(0, -2).join(', '),
        street2: '',
        city: parts[parts.length - 2],
        state: stateZipMatch[1],
        zipCode: stateZipMatch[2]
      };
    } else {
      // Validate Address object
      if (!address.street1 || !address.city || !address.state || !address.zipCode) {
        return {
          status: 400,
          jsonBody: { error: 'Complete address with street1, city, state, and zipCode is required' }
        };      }
      addressObj = address;
    }    
    
    // Geocode the address
    try {
      context.log(`🗺️  Starting geocoding for address:`, addressObj);
      context.log(`🔧 Geocoding service status: ${geocodingService ? 'initialized' : 'not initialized'}`);
      
      const coordinates = await geocodingService.geocodeAddress(addressObj);
      
      context.log(`✅ Successfully geocoded to:`, coordinates);
      return {
        status: 200,
        jsonBody: coordinates,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    } catch (geocodingError) {
      const errorMessage = geocodingError instanceof Error ? geocodingError.message : String(geocodingError);
      context.log('❌ Geocoding service error:', errorMessage);
      context.log('❌ Full geocoding error:', geocodingError);
      
      // Return more specific error based on the type of failure
      if (errorMessage.includes('No geocoding results found')) {
        return {
          status: 404,
          jsonBody: { 
            error: 'Address not found',
            message: 'The provided address could not be geocoded. Please verify the address is correct and complete.',
            address: addressObj
          }
        };
      } else if (errorMessage.includes('Authentication failed') || errorMessage.includes('401')) {
        return {
          status: 503,
          jsonBody: { 
            error: 'Service temporarily unavailable',
            message: 'Geocoding service authentication failed. Please try again later.'
          }
        };
      } else if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
        return {
          status: 429,
          jsonBody: { 
            error: 'Rate limit exceeded',
            message: 'Too many geocoding requests. Please try again later.'
          }        };
      } else {
        return {
          status: 500,
          jsonBody: { 
            error: 'Geocoding failed',
            message: errorMessage,
            address: addressObj
          }
        };
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    context.log('❌ Unexpected error in geocoding function:', errorMessage);
    
    return {
      status: 500,
      jsonBody: { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the geocoding request.'
      },
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    };
  }
}

app.http('geocode', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: geocode,
});
