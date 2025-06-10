import type { Address } from '../types';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

class GeocodingService {
  // Mock geocoding for development - in production this would use Azure Maps Search API
  async geocodeAddress(address: Address): Promise<Coordinates> {
    // For development, return mock coordinates based on city
    const mockCoordinates = this.getMockCoordinates(address.city, address.state);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return mockCoordinates;
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

  // In production, this would use Azure Maps Search API
  async geocodeWithAzureMaps(address: Address, apiKey: string): Promise<Coordinates> {
    const addressString = this.formatAddressForGeocoding(address);
    
    try {
      const response = await fetch(
        `https://atlas.microsoft.com/search/address/json?api-version=1.0&subscription-key=${apiKey}&query=${encodeURIComponent(addressString)}`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        return {
          latitude: result.position.lat,
          longitude: result.position.lon,
        };
      } else {
        throw new Error('No geocoding results found');
      }
    } catch (error) {
      console.error('Azure Maps geocoding error:', error);
      // Fallback to mock coordinates
      return this.getMockCoordinates(address.city, address.state);
    }
  }

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

  // Helper method to format address for display
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
