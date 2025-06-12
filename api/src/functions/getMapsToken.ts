import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { DefaultAzureCredential } from '@azure/identity';

/**
 * Azure Function to get Azure Maps access token using managed identity
 * This endpoint is called by the frontend to get proper authentication for Azure Maps
 */
export async function getMapsToken(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Azure Maps token request received');

  try {
    // Check if user is authenticated via Static Web Apps
    const clientPrincipalHeader = request.headers.get('x-ms-client-principal');
    if (!clientPrincipalHeader) {
      return {
        status: 401,
        jsonBody: { error: 'Authentication required' }
      };
    }

    // Use managed identity to get Azure Maps token
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://atlas.microsoft.com/.default');
    
    if (!tokenResponse || !tokenResponse.token) {
      throw new Error('Failed to obtain Azure Maps access token');
    }

    return {
      status: 200,
      jsonBody: {
        token: tokenResponse.token,
        expiresOn: tokenResponse.expiresOnTimestamp
      }
    };

  } catch (error) {
    context.log('Error getting Azure Maps token:', error);
    
    return {
      status: 500,
      jsonBody: { 
        error: 'Failed to get Azure Maps token',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

// Register the function
app.http('getMapsToken', {
  methods: ['GET'],
  authLevel: 'anonymous', // Auth handled by SWA
  handler: getMapsToken,
});
