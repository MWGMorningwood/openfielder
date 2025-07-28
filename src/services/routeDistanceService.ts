import type { Address, Coordinates, DistanceCalculation } from '../types';
import { mapGeocodingService } from './mapGeocodingService';

/**
 * Route calculation response from Azure Maps Route Matrix API
 */
interface RouteMatrixResponse {
  matrix: RouteMatrixElement[][];
}

interface RouteMatrixElement {
  statusCode: number;
  response?: {
    routeSummary: {
      lengthInMeters: number;
      travelTimeInSeconds: number;
    };
  };
}

/**
 * Enhanced distance calculation that includes both straight-line and route distances
 */
export interface EnhancedDistanceCalculation extends DistanceCalculation {
  /** Straight-line distance in kilometers */
  straightLineDistance: number;
  /** Route distance in kilometers (driving) */
  routeDistance?: number;
  /** Travel time in minutes */
  travelTimeMinutes?: number;
  /** Whether route calculation was successful */
  routeCalculationSuccess: boolean;
}

/**
 * Service for calculating route-based distances using Azure Maps Route Matrix API
 * Provides both straight-line distance and actual driving route distance/time
 */
export class RouteDistanceService {
  private readonly routeCache = new Map<string, { distance: number; time: number }>();

  /**
   * Calculate enhanced distance information between a client and multiple therapists
   * @param clientAddress Client's address
   * @param therapistAddresses Array of therapist addresses with IDs
   * @returns Promise resolving to enhanced distance calculations
   */
  public async calculateDistancesToTherapists(
    clientAddress: Address,
    therapistAddresses: Array<{ id: string; name: string; address: Address }>
  ): Promise<EnhancedDistanceCalculation[]> {
    console.log(`🗺️ Calculating distances from client to ${therapistAddresses.length} therapists...`);

    try {
      // First, geocode all addresses
      const [clientCoords, ...therapistCoords] = await Promise.all([
        mapGeocodingService.geocodeAddress(clientAddress),
        ...therapistAddresses.map(t => mapGeocodingService.geocodeAddress(t.address))
      ]);

      // Calculate straight-line distances
      const straightLineResults = therapistAddresses.map((therapist, index) => {
        const therapistCoord = therapistCoords[index];
        const straightLineDistance = this.haversineDistance(
          clientCoords.latitude, clientCoords.longitude,
          therapistCoord.latitude, therapistCoord.longitude
        );

        return {
          therapistId: therapist.id,
          clientId: 'client', // Will be filled in by caller
          distance: straightLineDistance,
          therapistName: therapist.name,
          clientName: 'Unknown', // Will be filled in by caller
          straightLineDistance,
          routeCalculationSuccess: false
        } as EnhancedDistanceCalculation;
      });

      // Calculate route distances using Azure Maps Route Matrix API
      try {
        const routeResults = await this.calculateRouteDistances(clientCoords, therapistCoords);
        
        // Merge route results with straight-line results
        return straightLineResults.map((result, index) => {
          const routeResult = routeResults[index];
          if (routeResult) {
            return {
              ...result,
              routeDistance: routeResult.distance,
              travelTimeMinutes: routeResult.time,
              routeCalculationSuccess: true,
              distance: routeResult.distance // Use route distance as primary distance
            };
          }
          return result;
        });
      } catch (routeError) {
        console.warn('⚠️ Route calculation failed, falling back to straight-line distances:', routeError);
        return straightLineResults;
      }
    } catch (error) {
      console.error('❌ Distance calculation failed:', error);
      throw new Error(`Failed to calculate distances: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate route distances using Azure Maps Route Matrix API via backend
   */
  private async calculateRouteDistances(
    origin: Coordinates,
    destinations: Coordinates[]
  ): Promise<Array<{ distance: number; time: number } | null>> {
    const cacheKey = this.createCacheKey(origin, destinations);
    
    // Check cache first
    if (this.routeCache.has(cacheKey)) {
      console.log('📍 Using cached route calculation');
      const cached = this.routeCache.get(cacheKey)!;
      return destinations.map(() => cached);
    }

    console.log(`🛣️ Calculating route distances via backend API...`);

    try {
      const response = await fetch('/api/route-matrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origins: [{ latitude: origin.latitude, longitude: origin.longitude }],
          destinations: destinations.map(dest => ({
            latitude: dest.latitude,
            longitude: dest.longitude
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Route Matrix API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const data: RouteMatrixResponse = await response.json();
      
      if (!data.matrix || !data.matrix[0]) {
        throw new Error('Invalid response from Route Matrix API');
      }

      // Process the matrix results
      const results = data.matrix[0].map(element => {
        if (element.statusCode === 200 && element.response) {
          const distanceKm = element.response.routeSummary.lengthInMeters / 1000;
          const timeMinutes = element.response.routeSummary.travelTimeInSeconds / 60;
          
          return {
            distance: distanceKm,
            time: timeMinutes
          };
        }
        return null;
      });

      // Cache the first result for future use
      if (results[0]) {
        this.routeCache.set(cacheKey, results[0]);
      }

      console.log(`✅ Route calculation successful for ${results.filter(r => r !== null).length} destinations`);
      return results;
    } catch (error) {
      console.error('❌ Route Matrix API call failed:', error);
      throw error;
    }
  }

  /**
   * Calculate straight-line distance using Haversine formula
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Create a cache key for route calculations
   */
  private createCacheKey(origin: Coordinates, destinations: Coordinates[]): string {
    const originStr = `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}`;
    const destStr = destinations.map(d => `${d.latitude.toFixed(6)},${d.longitude.toFixed(6)}`).join('|');
    return `${originStr}->${destStr}`;
  }

  /**
   * Clear the route cache
   */
  public clearCache(): void {
    this.routeCache.clear();
    console.log('🛣️ Route distance cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.routeCache.size,
      keys: Array.from(this.routeCache.keys())
    };
  }
}

// Singleton instance
export const routeDistanceService = new RouteDistanceService();
