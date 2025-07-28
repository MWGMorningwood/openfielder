import type { Coordinates, RouteResult } from '../types';

/**
 * Frontend service for individual route directions using Azure Maps
 * Uses the backend Route Directions API for detailed route calculations
 */
export class RouteDirectionsClientService {
  private readonly routeCache = new Map<string, RouteResult>();

  /**
   * Calculate route between two coordinates
   * @param origin Starting coordinates
   * @param destination Ending coordinates
   * @returns Promise resolving to route information
   */
  public async calculateRoute(origin: Coordinates, destination: Coordinates): Promise<RouteResult> {
    const cacheKey = this.createCacheKey(origin, destination);
    
    // Check cache first
    if (this.routeCache.has(cacheKey)) {
      console.log('📍 Using cached route calculation');
      return this.routeCache.get(cacheKey)!;
    }

    console.log(`🛣️ Calculating route from [${origin.latitude}, ${origin.longitude}] to [${destination.latitude}, ${destination.longitude}]...`);

    try {
      const response = await fetch('/api/routeDirections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          origin,
          destination
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Route Directions API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData.error || 'Unknown error'
        });
        throw new Error(`Route Directions API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json() as { success: boolean; route: RouteResult };
      
      if (!data.success || !data.route) {
        throw new Error('Invalid response from Route Directions API');
      }

      const routeResult = data.route;
      
      // Cache the result
      this.routeCache.set(cacheKey, routeResult);

      console.log(`✅ Route calculation successful: ${routeResult.distanceKm.toFixed(2)}km, ${routeResult.travelTimeMinutes}min`);
      return routeResult;
    } catch (error) {
      console.error('❌ Route calculation failed:', error);
      throw new Error(`Failed to calculate route: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Calculate routes to multiple destinations efficiently
   * @param origin Starting coordinates
   * @param destinations Array of destination coordinates
   * @returns Promise resolving to array of route results
   */
  public async calculateRoutesToDestinations(
    origin: Coordinates,
    destinations: Coordinates[]
  ): Promise<(RouteResult | null)[]> {
    console.log(`🛣️ Calculating routes to ${destinations.length} destinations...`);

    // Calculate routes in parallel but with some throttling to avoid overwhelming the API
    const promises = destinations.map(async (dest, index) => {
      try {
        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, index * 100));
        return await this.calculateRoute(origin, dest);
      } catch (error) {
        console.warn(`⚠️ Failed to calculate route to destination ${index + 1}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r !== null).length;
    
    console.log(`✅ Calculated ${successCount}/${destinations.length} routes successfully`);
    return results;
  }

  /**
   * Create cache key for route calculations
   */
  private createCacheKey(origin: Coordinates, destination: Coordinates): string {
    return `${origin.latitude.toFixed(6)},${origin.longitude.toFixed(6)}->${destination.latitude.toFixed(6)},${destination.longitude.toFixed(6)}`;
  }

  /**
   * Clear the route cache
   */
  public clearCache(): void {
    this.routeCache.clear();
    console.log('🛣️ Route directions cache cleared');
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
export const routeDirectionsClientService = new RouteDirectionsClientService();
