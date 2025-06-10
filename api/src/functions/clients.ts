import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OpenFielderService } from '../services/openFielderService';
import { CreateClientRequest } from '../types';

/**
 * Azure Function to handle client operations
 * GET /api/clients - Get all clients
 * POST /api/clients - Create new client
 */
export async function clientsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log(`Http function processed request for url "${request.url}"`);

  const service = new OpenFielderService();
  
  try {
    await service.initialize();

    switch (request.method) {
      case 'GET':
        return await handleGetClients(service, context);
      
      case 'POST':
        return await handleCreateClient(service, request, context);
      
      default:
        return {
          status: 405,
          jsonBody: { error: 'Method not allowed' }
        };
    }
  } catch (error: any) {
    context.log('Error in clients function:', error);
    return {
      status: 500,
      jsonBody: { error: 'Internal server error', details: error.message }
    };
  }
}

async function handleGetClients(service: OpenFielderService, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const clients = await service.getAllClients();
    context.log(`Retrieved ${clients.length} clients`);
    
    return {
      status: 200,
      jsonBody: { clients },
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  } catch (error: any) {
    context.log('Error getting clients:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to retrieve clients', details: error.message }
    };
  }
}

async function handleCreateClient(
  service: OpenFielderService, 
  request: HttpRequest, 
  context: InvocationContext
): Promise<HttpResponseInit> {
  try {
    const body = await request.json() as CreateClientRequest;
    
    // Validate required fields
    if (!body.name || !body.latitude || !body.longitude || !body.address || !body.priority) {
      return {
        status: 400,
        jsonBody: { 
          error: 'Missing required fields', 
          required: ['name', 'latitude', 'longitude', 'address', 'priority'] 
        }
      };
    }

    const client = await service.createClient(body);
    context.log(`Created client: ${client.name} (${client.id})`);
    
    return {
      status: 201,
      jsonBody: { client },
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  } catch (error: any) {
    context.log('Error creating client:', error);
    return {
      status: 500,
      jsonBody: { error: 'Failed to create client', details: error.message }
    };
  }
}

// Register the function
app.http('clients', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: clientsFunction,
});
