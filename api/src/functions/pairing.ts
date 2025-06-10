import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OpenFielderService } from '../services/openFielderService';

/**
 * Azure Function to handle pairing operations
 * GET /api/pairing/nearest/{clientId} - Find nearest therapists to a client
 * POST /api/pairing/pair - Pair a therapist with a client
 * POST /api/pairing/unpair - Unpair a therapist from a client
 */
export async function pairingFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const service = new OpenFielderService();
  
  try {
    await service.initialize();

    const url = new URL(request.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Extract operation from path: /api/pairing/{operation}
    const operation = pathSegments[2]; // api/pairing/[operation]

    switch (request.method) {
      case 'GET':
        if (operation === 'nearest') {
          const clientId = pathSegments[3];
          return await handleGetNearestTherapists(service, clientId, request, context);
        }
        break;
      
      case 'POST':
        if (operation === 'pair') {
          return await handlePairTherapist(service, request, context);
        } else if (operation === 'unpair') {
          return await handleUnpairTherapist(service, request, context);
        }
        break;
    }

    return {
      status: 404,
      jsonBody: { error: 'Endpoint not found' }
    };

  } catch (error: any) {
    context.log('Error in pairing function:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message }
    };
  }
}

async function handleGetNearestTherapists(
  service: OpenFielderService,
  clientId: string,
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    if (!clientId) {
      return {
        status: 400,
        jsonBody: { error: 'Client ID is required' }
      };
    }

    const url = new URL(request.url);
    const maxResults = parseInt(url.searchParams.get('limit') || '10');

    const nearestTherapists = await service.findNearestTherapists(clientId, maxResults);
    context.log(`Found ${nearestTherapists.length} nearest therapists for client ${clientId}`);
    
    return {
      status: 200,
      jsonBody: { nearestTherapists },
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  } catch (error: any) {
    context.log('Error finding nearest therapists:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to find nearest therapists', details: error.message }
    };
  }
}

async function handlePairTherapist(
  service: OpenFielderService, 
  request: HttpRequest, 
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as { therapistId: string; clientId: string };
    
    if (!body.therapistId || !body.clientId) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Missing required fields', 
          required: ['therapistId', 'clientId'] 
        }
      };
    }

    await service.pairTherapistWithClient(body.therapistId, body.clientId);
    context.log(`Paired therapist ${body.therapistId} with client ${body.clientId}`);
    
    return {
      status: 200,
      jsonBody: { 
        message: 'Successfully paired therapist with client',
        therapistId: body.therapistId,
        clientId: body.clientId
      },
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  } catch (error: any) {
    context.log('Error pairing therapist:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to pair therapist', details: error.message }
    };
  }
}

async function handleUnpairTherapist(
  service: OpenFielderService, 
  request: HttpRequest, 
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as { therapistId: string };
    
    if (!body.therapistId) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Missing required fields', 
          required: ['therapistId'] 
        }
      };
    }

    await service.unpairTherapistFromClient(body.therapistId);
    context.log(`Unpaired therapist ${body.therapistId}`);
    
    return {
      status: 200,
      jsonBody: { 
        message: 'Successfully unpaired therapist',
        therapistId: body.therapistId
      },
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  } catch (error: any) {
    context.log('Error unpairing therapist:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to unpair therapist', details: error.message }
    };
  }
}

// Register the function with wildcard routing
app.http('pairing', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'pairing/{*restOfPath}',
  handler: pairingFunction,
});
