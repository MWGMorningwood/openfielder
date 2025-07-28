import type { Address } from '../types';
import { DefaultAzureCredential } from '@azure/identity';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface DistanceResult {
  straightLineDistance: number; // in kilometers
  routeDistance?: number; // in kilometers
  routeDuration?: number; // in seconds
}

/**
 * Azure Maps Route API response interfaces
 */
interface RouteApiResponse {
  routes: Array<{
    summary: {
      lengthInMeters: number;
      travelTimeInSeconds: number;
    };
  }>;
}

/**
 * Route calculation service using Azure Maps
 * Provides both straight-line distance and actual route distance/duration
 */
export class RouteCalculationService {
  private credential: DefaultAzureCredential;
  private mapsClientId: string;
  private baseUrl = 'https://atlas.microsoft.com';

  constructor() {
    console.log('🔧 Initializing RouteCalculationService...');
    
    this.mapsClientId = process.env.AZURE_MAPS_CLIENT_ID || '';
    
    if (!this.mapsClientId) {
      throw new Error('AZURE_MAPS_CLIENT_ID environment variable is required');
    }

    this.credential = new DefaultAzureCredential({
      loggingOptions: {
        allowLoggingAccountIdentifiers: true
      }
    });
    
    console.log('✅ RouteCalculationService initialized');
  }

  /**
   * Calculate both straight-line and route distance between two coordinates
   */
  public async calculateDistances(
    fromCoords: Coordinates,
    toCoords: Coordinates
  ): Promise<DistanceResult> {
    // Calculate straight-line distance (Haversine formula)
    const straightLineDistance = this.calculateHaversineDistance(fromCoords, toCoords);
    
    try {
      // Calculate route distance using Azure Maps
      const routeInfo = await this.calculateRouteDistance(fromCoords, toCoords);
      
      return {
        straightLineDistance,
        routeDistance: routeInfo.distance,
        routeDuration: routeInfo.duration
      };
    } catch (error) {
      console.warn('Failed to calculate route distance, using straight-line only:', error);
      
      // Return straight-line distance only if route calculation fails
      return {
        straightLineDistance
      };
    }
  }

  /**
   * Calculate straight-line distance using Haversine formula
   */
  private calculateHaversineDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(to.latitude - from.latitude);
    const dLon = this.degreesToRadians(to.longitude - from.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(from.latitude)) * 
      Math.cos(this.degreesToRadians(to.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate route distance and duration using Azure Maps Route API
   */
  private async calculateRouteDistance(
    from: Coordinates,
    to: Coordinates
  ): Promise<{ distance: number; duration: number }> {
    const accessToken = await this.getAccessToken();
    
    // Construct route query points
    const query = `${from.latitude},${from.longitude}:${to.latitude},${to.longitude}`;
    
    const url = new URL(`${this.baseUrl}/route/directions/json`);
    url.searchParams.set('api-version', '1.0');
    url.searchParams.set('query', query);
    url.searchParams.set('travelMode', 'car');
    url.searchParams.set('routeType', 'fastest');
    url.searchParams.set('traffic', 'false'); // Use traffic-free calculation for consistency
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Azure Maps Route API failed: ${response.status} ${response.statusText} - ${errorText}`);
    }    const data = await response.json() as RouteApiResponse;
    
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No route found between the specified coordinates');
    }

    const route = data.routes[0];
    const summary = route.summary;
    
    // Convert from meters to kilometers
    const distanceKm = summary.lengthInMeters / 1000;
    
    return {
      distance: distanceKm,
      duration: summary.travelTimeInSeconds
    };
  }

  /**
   * Get access token for Azure Maps using managed identity
   */
  private async getAccessToken(): Promise<string> {
    try {
      console.log('🔐 Getting Azure Maps access token...');
      
      const tokenResponse = await this.credential.getToken('https://atlas.microsoft.com/.default');
      
      if (!tokenResponse || !tokenResponse.token) {
        throw new Error('Failed to obtain access token');
      }
      
      console.log('✅ Successfully obtained access token');
      return tokenResponse.token;
    } catch (error) {
      console.error('❌ Failed to get Azure access token:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Convert degrees to radians
   */
  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format distance for display
   */
  public static formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)}m`;
    }
    return `${distanceKm.toFixed(1)}km`;
  }

  /**
   * Format duration for display
   */
  public static formatDuration(durationSeconds: number): string {
    const minutes = Math.round(durationSeconds / 60);
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }
}

// Singleton instance
export const routeCalculationService = new RouteCalculationService();
