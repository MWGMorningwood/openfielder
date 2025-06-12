import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { OpenFielderService } from '../services/openFielderService';

/**
 * Azure Function endpoint that explains the new architecture
 * POST /api/regeocodeAll - Returns information about coordinate-free architecture
 */
export async function regeocodeAllFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Regeocoding endpoint called - explaining new architecture');

  const service = new OpenFielderService();
  
  try {
    await service.initialize();

    if (request.method !== 'POST') {
      return {
        status: 405,
        jsonBody: { error: 'Method not allowed. Use POST.' }
      };
    }

    // Since we no longer store coordinates in the database,
    // this function is no longer needed. Geocoding is done on-demand in the frontend.
    
    const [therapists, clients] = await Promise.all([
      service.getAllTherapists(),
      service.getAllClients()
    ]);

    const results = {
      message: 'Coordinates are no longer stored in database',
      architecture: 'On-demand geocoding in frontend',
      explanation: 'Addresses are stored as the single source of truth. Coordinates are geocoded on-demand when displaying maps.',
      benefits: [
        'Addresses always remain current source of truth',
        'No stale coordinate data',
        'Simpler backend data model',
        'Frontend handles geocoding with caching'
      ],
      therapists: { 
        total: therapists.length, 
        message: 'Addresses stored, coordinates geocoded on-demand' 
      },
      clients: { 
        total: clients.length, 
        message: 'Addresses stored, coordinates geocoded on-demand' 
      }
    };

    context.log('Explained new coordinate-free architecture');
    
    return {
      status: 200,
      jsonBody: results,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  } catch (error: unknown) {
    context.log('Error in regeocodeAll function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      status: 500,
      jsonBody: { error: 'Failed to get architecture info', details: message }
    };
  }
}

// Register the function
app.http('regeocodeAll', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: regeocodeAllFunction,
});
