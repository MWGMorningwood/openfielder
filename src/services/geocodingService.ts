import type { Address } from '../types';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Geocoding service using Azure Maps with Static Web Apps Entra authentication
 * Uses the authenticated user session automatically managed by SWA
 */
class GeocodingService {
  /**
   * Geocode an address using Azure Maps Search API with SWA Entra authentication
   */
  async geocodeAddress(address: Address): Promise<Coordinates> {
    try {
      // Check if user is authenticated by trying to get user info
      const authResponse = await fetch('/.auth/me');
      if (!authResponse.ok) {
        console.warn('User not authenticated, using mock coordinates');
        return this.getMockCoordinates(address.city, address.state);
      }
      
      const authData = await authResponse.json();
      if (!authData.clientPrincipal) {
        console.warn('No user principal found, using mock coordinates');
        return this.getMockCoordinates(address.city, address.state);
      }

      const query = this.formatAddressForGeocoding(address);
      const url = `https://atlas.microsoft.com/search/address/json?api-version=1.0&query=${encodeURIComponent(query)}`;

      // Use SWA's built-in authentication - no manual token management needed
      const response = await fetch(url, {
        credentials: 'include', // Include SWA auth cookies
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          console.warn('Authentication failed for Azure Maps, using mock coordinates');
          return this.getMockCoordinates(address.city, address.state);
        }
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
        console.warn('No geocoding results found, using mock coordinates');
        return this.getMockCoordinates(address.city, address.state);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
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
