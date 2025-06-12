import type { Address } from '../types';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Frontend geocoding service that calls the backend Azure Functions geocoding endpoint
 */
export class GeocodingService {
  /**
   * Convert an address to coordinates using the backend geocoding service
   * @param address The address to geocode
   * @returns Promise resolving to coordinates
   */
  public async geocodeAddress(address: Address): Promise<Coordinates> {
    const response = await fetch('/api/geocode', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ address }),
    });

    if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
    }

    const coordinates: Coordinates = await response.json();
    return coordinates;
  }

  /**
   * Format address object as a display string
   * @param address Address object
   * @returns Formatted address string for display
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
   * Format address object for geocoding API calls
   * @param address Address object
   * @returns Formatted address string for geocoding
   */
  public formatAddressForGeocoding(address: Address): string {
    const parts = [
      address.street1,
      address.street2,
      address.city,
      address.state,
      address.zipCode,
    ].filter(part => part?.trim());
    
    return parts.join(', ');
  }
}

// Singleton instance
export const geocodingService = new GeocodingService();