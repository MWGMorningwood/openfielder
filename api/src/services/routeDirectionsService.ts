import type { Coordinates } from './geocodingService';
import { azureMapsAuthService } from './azureMapsAuthService';
import { RetryUtilityService } from './retryUtilityService';

/**
 * Route directions service for calculating routes and travel times
 * Uses Azure Maps Route Directions API with Entra ID authentication
 */
export class RouteDirectionsService {
  constructor() {
    console.log('🔧 Initializing RouteDirectionsService...');
    console.log('✅ Using shared AzureMapsAuthService for authentication');
    console.log('✅ Using shared RetryUtilityService for robust error handling');
  }

  /**
   * Calculate route between two points with travel time
   * @param origin Starting coordinates
   * @param destination Ending coordinates
   * @returns Promise resolving to route information
   */
  public async calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    try {
      const routeResult = await RetryUtilityService.retryOperation(
        () => this.calculateRouteWithAzureMaps(origin, destination),
        3, // maxRetries
        1000, // baseDelay (1 second)
        1000 // jitterRange (1 second)
      );
      
      console.log(`✅ Successfully calculated route: ${routeResult.distanceKm.toFixed(2)}km, ${routeResult.travelTimeMinutes}min`);
      return routeResult;
    } catch (error) {
      console.error(`❌ Failed to calculate route from [${origin.latitude}, ${origin.longitude}] to [${destination.latitude}, ${destination.longitude}]:`, error);
      throw new Error(`Failed to calculate route: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate route using Azure Maps Route Directions API
   * @param origin Starting coordinates
   * @param destination Ending coordinates
   * @returns Promise resolving to route information
   */
  private async calculateRouteWithAzureMaps(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    try {
      console.log(`🗺️  Calculating route from [${origin.latitude}, ${origin.longitude}] to [${destination.latitude}, ${destination.longitude}] with Azure Maps Route Directions API...`);
      
      // Get authenticated headers from shared service
      const headers = await azureMapsAuthService.getAuthHeaders();
      
      // Build route query parameters
      const params = new URLSearchParams({
        'api-version': '2023-10-01-preview',
        'query': `${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`,
        'travelMode': 'car',
        'routeType': 'fastest',
        'traffic': 'true',
        'computeTravelTime': 'all',
        'language': 'en-US'
      });
      
      const url = `https://atlas.microsoft.com/route/directions/json?${params.toString()}`;
      
      console.log(`🔗 Request URL: ${url}`);
      console.log(`📦 Route parameters:`, {
        origin: `${origin.latitude},${origin.longitude}`,
        destination: `${destination.latitude},${destination.longitude}`,
        travelMode: 'car',
        routeType: 'fastest',
        traffic: true
      });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...headers,
          'Accept': 'application/json'
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Azure Maps Route Directions API error response:`, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          origin: `${origin.latitude},${origin.longitude}`,
          destination: `${destination.latitude},${destination.longitude}`
        });
        throw new Error(`Azure Maps Route Directions API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      const data = await response.json() as AzureRouteDirectionsResponse;
      
      if (!data.routes || data.routes.length === 0) {
        throw new Error(`No route found between coordinates`);
      }
      
      const route = data.routes[0];
      const summary = route.summary;
      
      if (!summary) {
        throw new Error('Route summary not available');
      }
      
      // Convert meters to kilometers
      const distanceKm = summary.lengthInMeters / 1000;
      
      // Convert seconds to minutes
      const travelTimeMinutes = Math.ceil(summary.travelTimeInSeconds / 60);
      
      const result: RouteResult = {
        distanceKm,
        travelTimeMinutes,
        trafficDelaySeconds: summary.trafficDelayInSeconds || 0,
        departureTime: summary.departureTime,
        arrivalTime: summary.arrivalTime
      };
      
      console.log(`✅ Azure Maps calculated route:`, {
        distance: `${distanceKm.toFixed(2)}km`,
        travelTime: `${travelTimeMinutes}min`,
        trafficDelay: summary.trafficDelayInSeconds ? `${summary.trafficDelayInSeconds}s` : 'none',
        departure: summary.departureTime,
        arrival: summary.arrivalTime
      });
      
      return result;
    } catch (error) {
      console.error(`❌ Azure Maps route calculation error:`, error);
      throw error;
    }
  }
}

/**
 * Route calculation result
 */
export interface RouteResult {
  /** Distance in kilometers */
  distanceKm: number;
  /** Travel time in minutes */
  travelTimeMinutes: number;
  /** Traffic delay in seconds */
  trafficDelaySeconds: number;
  /** Departure time (ISO string) */
  departureTime?: string;
  /** Arrival time (ISO string) */
  arrivalTime?: string;
}

/**
 * Azure Maps Route Directions API response structure
 */
interface AzureRouteDirectionsResponse {
  formatVersion?: string;
  routes?: Array<{
    summary?: {
      lengthInMeters: number;
      travelTimeInSeconds: number;
      trafficDelayInSeconds?: number;
      departureTime?: string;
      arrivalTime?: string;
    };
    legs?: Array<{
      summary?: {
        lengthInMeters: number;
        travelTimeInSeconds: number;
        trafficDelayInSeconds?: number;
        departureTime?: string;
        arrivalTime?: string;
      };
    }>;
  }>;
}

// Singleton instance
export const routeDirectionsService = new RouteDirectionsService();
