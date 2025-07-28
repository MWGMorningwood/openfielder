import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { azureMapsAuthService } from '../services/azureMapsAuthService';
import { RetryUtilityService } from '../services/retryUtilityService';

/**
 * Azure Function to handle route matrix calculations using Azure Maps
 * POST /api/route-matrix - Calculate route distances and times between origins and destinations
 * 
 * SECURITY NOTE: This function uses the shared Azure Maps authentication service.
 * SUBSCRIPTION KEYS ARE EXPLICITLY FORBIDDEN for security reasons.
 * All Azure Maps access must be through RBAC and managed identity via the shared auth service.
 */

interface RouteMatrixRequest {
  origins: Array<{ latitude: number; longitude: number }>;
  destinations: Array<{ latitude: number; longitude: number }>;
}

interface AzureMapsRouteMatrixResponse {
  matrix: Array<Array<{
    statusCode: number;
    response?: {
      routeSummary: {
        lengthInMeters: number;
        travelTimeInSeconds: number;
      };
    };
  }>>;
}

/**
 * Helper function to call Azure Maps Route Matrix API
 */
async function callAzureMapsRouteMatrix(
  url: URL,
  headers: Record<string, string>,
  requestBody: {
    origins: { type: string; coordinates: number[][] };
    destinations: { type: string; coordinates: number[][] };
  },
  context: InvocationContext
): Promise<AzureMapsRouteMatrixResponse> {
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      ...headers,
      'Accept': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    context.log(`Azure Maps API error: ${response.status} ${response.statusText} - ${errorText}`);
    throw new Error(`Azure Maps Route Matrix API error: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json() as AzureMapsRouteMatrixResponse;
}

export async function routeMatrixFunction(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(`Route Matrix function processed request for url "${request.url}"`);

  try {
    if (request.method !== 'POST') {
      return {
        status: 405,
        jsonBody: { error: 'Method not allowed. Use POST.' }
      };
    }

    const body = await request.json() as RouteMatrixRequest;
    
    if (!body.origins || !body.destinations || !Array.isArray(body.origins) || !Array.isArray(body.destinations)) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Invalid request body. Expected origins and destinations arrays.',
          required: ['origins', 'destinations']
        }
      };
    }

    if (body.origins.length === 0 || body.destinations.length === 0) {
      return {
        status: 400,
        jsonBody: { error: 'Origins and destinations arrays must not be empty.' }
      };
    }

    // Validate coordinate format
    const validateCoordinates = (coords: Array<{ latitude: number; longitude: number }>, type: string) => {
      for (const coord of coords) {
        if (typeof coord.latitude !== 'number' || typeof coord.longitude !== 'number') {
          throw new Error(`Invalid ${type} coordinates. Expected numeric latitude and longitude.`);
        }
        if (coord.latitude < -90 || coord.latitude > 90) {
          throw new Error(`Invalid ${type} latitude: ${coord.latitude}. Must be between -90 and 90.`);
        }
        if (coord.longitude < -180 || coord.longitude > 180) {
          throw new Error(`Invalid ${type} longitude: ${coord.longitude}. Must be between -180 and 180.`);
        }
      }
    };

    validateCoordinates(body.origins, 'origin');
    validateCoordinates(body.destinations, 'destination');

    // Build Azure Maps Route Matrix API URL
    const apiVersion = '1.0';
    const baseUrl = 'https://atlas.microsoft.com/route/matrix/json';
    const url = new URL(baseUrl);
    url.searchParams.set('api-version', apiVersion);

    const requestBody = {
      origins: {
        type: 'MultiPoint',
        coordinates: body.origins.map(o => [o.longitude, o.latitude])
      },
      destinations: {
        type: 'MultiPoint', 
        coordinates: body.destinations.map(d => [d.longitude, d.latitude])
      }
    };

    context.log(`Calling Azure Maps Route Matrix API with ${body.origins.length} origins and ${body.destinations.length} destinations`);

    // Get authenticated headers using shared Azure Maps auth service  
    const headers = await azureMapsAuthService.getAuthHeaders();
    context.log('✅ Successfully obtained Azure Maps authentication via shared service');

    // Call Azure Maps API with retry logic for reliability
    const azureMapsData = await RetryUtilityService.retryOperation(async () => {
      return await callAzureMapsRouteMatrix(url, headers, requestBody, context);
    }, 3, 1000, 1000);

    context.log(`✅ Azure Maps Route Matrix API call successful`);

    return {
      status: 200,
      jsonBody: azureMapsData,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };

  } catch (error: unknown) {
    context.log('Error in route matrix function:', error);
    return {
      status: 500,
      jsonBody: { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error)
      }
    };
  }
}

// Register the function
app.http('routeMatrix', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'route-matrix',
  handler: routeMatrixFunction,
});
