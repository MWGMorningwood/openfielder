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
    }  } catch (error: any) {
    context.log('Error in therapists function:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message }
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
    };  } catch (error: any) {
    context.log('Error getting therapists:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to retrieve therapists', details: error.message }
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
    if (!body.name || !body.latitude || !body.longitude || !body.address || !body.availability) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Missing required fields', 
          required: ['name', 'latitude', 'longitude', 'address', 'availability'] 
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
    };  } catch (error: any) {
    context.log('Error creating therapist:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to create therapist', details: error.message }
    };
  }
}

// Register the function
app.http('therapists', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: therapistsFunction,
});
