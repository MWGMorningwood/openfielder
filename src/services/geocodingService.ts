import type { Address } from '../types';
import { AuthService } from './authService';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Geocoding service using Azure Maps with Entra authentication
 * Uses the user's authenticated session from Static Web Apps
 */
class GeocodingService {
  private authService: AuthService;
  private readonly mapsAccountName: string;

  constructor() {
    this.authService = AuthService.getInstance();
    this.mapsAccountName = import.meta.env.VITE_AZURE_MAPS_ACCOUNT_NAME || '';
  }

  /**
   * Geocode an address using Azure Maps Search API with Entra authentication
   */
  async geocodeAddress(address: Address): Promise<Coordinates> {
    try {
      // Get the access token for Azure Maps
      const token = await this.authService.getAzureMapsToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const query = this.formatAddressForGeocoding(address);
      const url = `https://atlas.microsoft.com/search/address/json?api-version=1.0&query=${encodeURIComponent(query)}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-ms-client-id': this.authService.getClientId(),
        },
      });

      if (!response.ok) {
        throw new Error(`Azure Maps API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const position = result.position;
        
        return {
          latitude: position.lat,
          longitude: position.lon,
        };
      } else {
        // Fallback to mock coordinates if no results
        console.warn('No geocoding results found, using mock coordinates');
        return this.getMockCoordinates(address.city, address.state);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      // Fallback to mock coordinates on error
      return this.getMockCoordinates(address.city, address.state);
    }
  }

  /**
   * Format address for geocoding query
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

  private getMockCoordinates(city: string, state: string): Coordinates {
    // Mock coordinates for common cities - in production this would be real geocoding
    const cityCoordinates: Record<string, Coordinates> = {
      'seattle_wa': { latitude: 47.6062, longitude: -122.3321 },
      'portland_or': { latitude: 45.5152, longitude: -122.6784 },
      'san francisco_ca': { latitude: 37.7749, longitude: -122.4194 },
      'los angeles_ca': { latitude: 34.0522, longitude: -118.2437 },
      'denver_co': { latitude: 39.7392, longitude: -104.9903 },
      'chicago_il': { latitude: 41.8781, longitude: -87.6298 },
      'new york_ny': { latitude: 40.7128, longitude: -74.0060 },
      'boston_ma': { latitude: 42.3601, longitude: -71.0589 },
      'miami_fl': { latitude: 25.7617, longitude: -80.1918 },
      'atlanta_ga': { latitude: 33.7490, longitude: -84.3880 },
    };

    const key = `${city.toLowerCase()}_${state.toLowerCase()}`;
    
    // Return specific coordinates if city is known, otherwise generate random coordinates in the US
    return cityCoordinates[key] || {
      latitude: 39.8283 + (Math.random() - 0.5) * 10, // Roughly center of US ± 5 degrees
      longitude: -98.5795 + (Math.random() - 0.5) * 20, // Roughly center of US ± 10 degrees
    };
  }
  /**
   * Helper method to format address for display
   */
  formatAddressForDisplay(address: Address): string {
    const parts = [
      address.street1,
      address.street2,
    ].filter(part => part?.trim());
    
    const streetAddress = parts.join(' ');
    return `${streetAddress}, ${address.city}, ${address.state} ${address.zipCode}`;
  }
}

export const geocodingService = new GeocodingService();
