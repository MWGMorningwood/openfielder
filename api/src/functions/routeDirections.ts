import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { routeDirectionsService } from '../services/routeDirectionsService';
import type { Coordinates } from '../services/geocodingService';

/**
 * Azure Function to calculate route directions between two points
 * Uses Azure Maps Route Directions API with managed identity authentication
 * 
 * SECURITY: This function uses only Azure managed identity authentication.
 * Subscription keys are explicitly forbidden per security policy.
 */
export async function routeDirections(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('🔗 Route directions API called');
  
  try {
    // Parse and validate request body
    const requestBody = await request.json() as RouteDirectionsRequest;
    
    if (!requestBody.origin || !requestBody.destination) {
      context.log('❌ Missing required parameters: origin and destination');
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Missing required parameters',
          message: 'Both origin and destination coordinates are required'
        })
      };
    }
    
    // Validate coordinate format
    const origin = requestBody.origin;
    const destination = requestBody.destination;
    
    if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) {
      context.log('❌ Invalid coordinate format');
      return {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Invalid coordinates',
          message: 'Coordinates must have valid latitude and longitude values'
        })
      };
    }
    
    context.log(`📍 Calculating route from [${origin.latitude}, ${origin.longitude}] to [${destination.latitude}, ${destination.longitude}]`);
    
    // Calculate route using the service
    const routeResult = await routeDirectionsService.calculateRoute(origin, destination);
    
    context.log(`✅ Route calculated successfully: ${routeResult.distanceKm.toFixed(2)}km, ${routeResult.travelTimeMinutes}min`);
    
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        route: routeResult
      })
    };
    
  } catch (error) {
    context.log('❌ Route directions error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Route calculation failed',
        message: errorMessage
      })
    };
  }
}

/**
 * Validate coordinates object
 */
function isValidCoordinates(coords: unknown): coords is Coordinates {
  if (!coords || typeof coords !== 'object') {
    return false;
  }
  
  const coordsObj = coords as Record<string, unknown>;
  
  return (
    typeof coordsObj.latitude === 'number' &&
    typeof coordsObj.longitude === 'number' &&
    coordsObj.latitude >= -90 &&
    coordsObj.latitude <= 90 &&
    coordsObj.longitude >= -180 &&
    coordsObj.longitude <= 180 &&
    !isNaN(coordsObj.latitude) &&
    !isNaN(coordsObj.longitude)
  );
}

/**
 * Request structure for route directions API
 */
interface RouteDirectionsRequest {
  origin: Coordinates;
  destination: Coordinates;
}

// Register the function with Azure Functions runtime
app.http('routeDirections', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: routeDirections,
});
