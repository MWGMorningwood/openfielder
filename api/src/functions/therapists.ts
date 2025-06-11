import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OpenFielderService } from '../services/openFielderService';
import { CreateTherapistRequest } from '../types';

/**
 * Azure Function to handle therapist operations
 * GET /api/therapists - Get all therapists
 * POST /api/therapists - Create new therapist
 */
export async function therapistsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const service = new OpenFielderService();
  
  try {
    await service.initialize();

    switch (request.method) {
      case 'GET':
        return await handleGetTherapists(service, context);
      
      case 'POST':
        return await handleCreateTherapist(service, request, context);
      
      default:
        return {
          status: 405,
          jsonBody: { error: 'Method not allowed' }
        };
    }  } catch (error: unknown) {
    context.log('Error in therapists function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 500,
      jsonBody: { error: 'Internal server error', details: message }
    };
  }
}

async function handleGetTherapists(service: OpenFielderService, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const therapists = await service.getAllTherapists();
    context.log(`Retrieved ${therapists.length} therapists`);
    
    return {
      status: 200,
      jsonBody: { therapists },
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };  } catch (error: unknown) {
    context.log('Error getting therapists:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 500,
      jsonBody: { error: 'Failed to retrieve therapists', details: message }
    };
  }
}

async function handleCreateTherapist(
  service: OpenFielderService, 
  request: HttpRequest, 
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    // Debug: log the request method and content type
    context.log(`Request method: ${request.method}`);
    context.log(`Content-Type: ${request.headers.get('content-type')}`);
      const body = await request.json() as CreateTherapistRequest;
    context.log(`Parsed body:`, body);
    
    // Validate required fields
    if (!body.name || !body.address || !body.availability) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Missing required fields', 
          required: ['name', 'address', 'availability'] 
        }
      };
    }

    // Validate address structure
    if (!body.address.street1 || !body.address.city || !body.address.state || !body.address.zipCode) {
      return {
        status: 400,
        jsonBody: {
          error: 'Invalid address',
          details: 'Address must include street1, city, state, and zipCode'
        }
      };
    }

    const therapist = await service.createTherapist(body);
    context.log(`Created therapist: ${therapist.name} (${therapist.id})`);
    
    return {
      status: 201,
      jsonBody: { therapist },
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };  } catch (error: unknown) {
    context.log('Error creating therapist:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 500,
      jsonBody: { error: 'Failed to create therapist', details: message }
    };
  }
}

// Register the function
app.http('therapists', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: therapistsFunction,
});
