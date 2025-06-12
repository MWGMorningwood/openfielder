import type { Address, Coordinates, Therapist, Client, TherapistWithCoordinates, ClientWithCoordinates } from '../types';

/**
 * Custom error class for geocoding failures
 */
export class GeocodingError extends Error {
  public readonly address: Address;
  public readonly details: string;

  constructor(message: string, address: Address, details: string) {
    super(message);
    this.name = 'GeocodingError';
    this.address = address;
    this.details = details;
  }
}

/**
 * Frontend geocoding service using Azure Maps directly
 * Provides on-demand geocoding without storing coordinates in database
 */
export class MapGeocodingService {
  private geocodeCache = new Map<string, Coordinates>();
  /**
   * Geocode a single address and return coordinates
   * @param address Address to geocode
   * @returns Promise resolving to coordinates
   * @throws {GeocodingError} When geocoding fails
   */
  public async geocodeAddress(address: Address): Promise<Coordinates> {
    const addressString = this.formatAddressForGeocoding(address);
    const cacheKey = addressString.toLowerCase();

    // Check cache first
    if (this.geocodeCache.has(cacheKey)) {
      console.log(`📍 Using cached coordinates for "${addressString}"`);
      return this.geocodeCache.get(cacheKey)!;
    }

    console.log(`🗺️  Geocoding "${addressString}" with backend API...`);
    
    try {      // Use backend API proxy for secure geocoding
      const coordinates = await this.geocodeWithBackendAPI(address);
      
      // Cache the result
      this.geocodeCache.set(cacheKey, coordinates);
      
      console.log(`✅ Geocoded "${addressString}" to ${coordinates.latitude}, ${coordinates.longitude}`);
      return coordinates;
    } catch (error) {
      console.error(`❌ Geocoding failed for "${addressString}":`, error);
      
      // Create a structured error for the UI
      const geocodingError = new GeocodingError(
        `Failed to geocode address "${addressString}"`,
        address,
        error instanceof Error ? error.message : String(error)
      );
      
      throw geocodingError;
    }
  }

  /**
   * Add coordinates to a therapist for map display
   */
  public async addCoordinatesToTherapist(therapist: Therapist): Promise<TherapistWithCoordinates> {
    const coordinates = await this.geocodeAddress(therapist.address);
    return {
      ...therapist,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    };
  }

  /**
   * Add coordinates to a client for map display
   */
  public async addCoordinatesToClient(client: Client): Promise<ClientWithCoordinates> {
    const coordinates = await this.geocodeAddress(client.address);
    return {
      ...client,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude
    };
  }

  /**
   * Add coordinates to multiple therapists
   */
  public async addCoordinatesToTherapists(therapists: Therapist[]): Promise<TherapistWithCoordinates[]> {
    const promises = therapists.map(therapist => this.addCoordinatesToTherapist(therapist));
    return Promise.all(promises);
  }

  /**
   * Add coordinates to multiple clients
   */
  public async addCoordinatesToClients(clients: Client[]): Promise<ClientWithCoordinates[]> {
    const promises = clients.map(client => this.addCoordinatesToClient(client));
    return Promise.all(promises);
  }

  /**
   * Calculate distance between two addresses
   */
  public async calculateDistance(address1: Address, address2: Address): Promise<number> {
    const [coords1, coords2] = await Promise.all([
      this.geocodeAddress(address1),
      this.geocodeAddress(address2)
    ]);

    return this.haversineDistance(
      coords1.latitude, coords1.longitude,
      coords2.latitude, coords2.longitude
    );
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
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
   * Format address for geocoding API
   */
  private formatAddressForGeocoding(address: Address): string {
    const parts = [
      address.street1,
      address.street2,
      address.city,
      address.state,
      address.zipCode,
    ].filter(part => part?.trim());
    
    return parts.join(', ');
  }

  /**
   * Format address for display to users
   */
  public formatAddressForDisplay(address: Address): string {
    const parts = [
      address.street1,
      address.street2,
    ].filter(part => part?.trim());
    
    const streetAddress = parts.join(' ');
    return `${streetAddress}, ${address.city}, ${address.state} ${address.zipCode}`;
  }

  /**
   * Clear the geocoding cache
   */
  public clearCache(): void {
    this.geocodeCache.clear();
    console.log('📍 Geocoding cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.geocodeCache.size,
      keys: Array.from(this.geocodeCache.keys())
    };
  }  /**
   * Geocode using our backend API proxy (which uses Azure Maps with RBAC)
   * @param address Address object to geocode
   * @returns Promise resolving to coordinates
   */  private async geocodeWithBackendAPI(address: Address): Promise<Coordinates> {
    try {
      console.log(`🌐 Calling backend geocoding API for: "${this.formatAddressForGeocoding(address)}"`);

      const response = await fetch('/api/geocode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          address: address 
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Backend geocoding API error: ${response.status} ${response.statusText} - ${errorData.error || 'Unknown error'}`);
      }

      const data = await response.json();
      
      if (!data.latitude || !data.longitude) {
        throw new Error(`Invalid response from backend geocoding API`);
      }

      const { latitude, longitude } = data;
      
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new Error(`Invalid coordinates received: lat=${latitude}, lon=${longitude}`);
      }

      console.log(`✅ Backend geocoding successful: ${latitude}, ${longitude}`);
      
      return {
        latitude,
        longitude
      };
    } catch (error) {
      const addressString = this.formatAddressForGeocoding(address);
      console.error(`❌ Backend geocoding failed for "${addressString}":`, error);
      throw new Error(`Geocoding failed for "${addressString}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }}

// Singleton instance
export const mapGeocodingService = new MapGeocodingService();
