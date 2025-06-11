import type { Address } from '../types';
import { DefaultAzureCredential } from '@azure/identity';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Geocoding service for converting addresses to coordinates
 * Uses Azure Maps with Entra Authentication in production, mock data for local development
 */
export class GeocodingService {
  private credential: DefaultAzureCredential | null = null;
  private mapsClientId: string | null = null;

  constructor() {
    // Initialize Azure credentials for production
    this.initializeAzureAuth();
  }

  /**
   * Initialize Azure authentication
   */
  private initializeAzureAuth(): void {
    try {
      // Only initialize in Azure environment (when AZURE_MAPS_CLIENT_ID is present)
      this.mapsClientId = process.env.AZURE_MAPS_CLIENT_ID || null;
      
      if (this.mapsClientId) {
        this.credential = new DefaultAzureCredential();
        console.log('Azure Maps Entra authentication initialized');
      } else {
        console.log('Running in local development mode - using mock geocoding');
      }
    } catch (error) {
      console.warn('Failed to initialize Azure authentication, falling back to mock:', error);
      this.credential = null;
      this.mapsClientId = null;
    }
  }

  /**
   * Convert an address to coordinates
   * @param address The address to geocode
   * @returns Promise resolving to coordinates
   */
  public async geocodeAddress(address: Address): Promise<Coordinates> {
    // Use Azure Maps in production if credentials are available
    if (this.credential && this.mapsClientId) {
      try {
        return await this.geocodeWithAzureMapsEntra(address);
      } catch (error) {
        console.warn('Azure Maps geocoding failed, falling back to mock:', error);
      }
    }
    
    // For development or fallback, return mock coordinates based on city/state
    return this.getMockCoordinates(address.city, address.state);
  }

  /**
   * Get access token for Azure Maps using managed identity
   */
  private async getAccessToken(): Promise<string> {
    if (!this.credential) {
      throw new Error('Azure credentials not initialized');
    }

    const tokenResponse = await this.credential.getToken('https://atlas.microsoft.com/.default');
    if (!tokenResponse) {
      throw new Error('Failed to get access token');
    }

    return tokenResponse.token;
  }

  /**
   * Geocode address using Azure Maps with Entra Authentication
   * @param address Address to geocode
   * @returns Promise resolving to coordinates
   */
  private async geocodeWithAzureMapsEntra(address: Address): Promise<Coordinates> {
    const addressString = this.formatAddressForGeocoding(address);
    const accessToken = await this.getAccessToken();
    
    try {
      const response = await fetch(
        `https://atlas.microsoft.com/search/address/json?api-version=1.0&query=${encodeURIComponent(addressString)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        throw new Error(`Azure Maps API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json() as {
        results?: Array<{
          position: {
            lat: number;
            lon: number;
          };
        }>;
      };
      
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        console.log(`Geocoded "${addressString}" to ${result.position.lat}, ${result.position.lon}`);
        return {
          latitude: result.position.lat,
          longitude: result.position.lon,
        };
      } else {
        throw new Error('No geocoding results found');
      }
    } catch (error) {
      console.error('Azure Maps geocoding error:', error);
      throw error; // Re-throw so caller can decide on fallback
    }
  }

  /**
   * Generate mock coordinates for development
   * @param city City name
   * @param state State abbreviation
   * @returns Mock coordinates
   */
  private getMockCoordinates(city: string, state: string): Coordinates {
    // Mock coordinates for common US cities
    const cityCoordinates: Record<string, Coordinates> = {
      'seattle_wa': { latitude: 47.6062, longitude: -122.3321 },
      'portland_or': { latitude: 45.5152, longitude: -122.6784 },
      'san francisco_ca': { latitude: 37.7749, longitude: -122.4194 },
      'los angeles_ca': { latitude: 34.0522, longitude: -118.2437 },
      'san diego_ca': { latitude: 32.7157, longitude: -117.1611 },
      'phoenix_az': { latitude: 33.4484, longitude: -112.0740 },
      'denver_co': { latitude: 39.7392, longitude: -104.9903 },
      'austin_tx': { latitude: 30.2672, longitude: -97.7431 },
      'dallas_tx': { latitude: 32.7767, longitude: -96.7970 },
      'houston_tx': { latitude: 29.7604, longitude: -95.3698 },
      'chicago_il': { latitude: 41.8781, longitude: -87.6298 },
      'detroit_mi': { latitude: 42.3314, longitude: -83.0458 },
      'minneapolis_mn': { latitude: 44.9778, longitude: -93.2650 },
      'new york_ny': { latitude: 40.7128, longitude: -74.0060 },
      'boston_ma': { latitude: 42.3601, longitude: -71.0589 },
      'philadelphia_pa': { latitude: 39.9526, longitude: -75.1652 },
      'washington_dc': { latitude: 38.9072, longitude: -77.0369 },
      'atlanta_ga': { latitude: 33.7490, longitude: -84.3880 },
      'miami_fl': { latitude: 25.7617, longitude: -80.1918 },
      'orlando_fl': { latitude: 28.5383, longitude: -81.3792 },
      'nashville_tn': { latitude: 36.1627, longitude: -86.7816 },
      'charlotte_nc': { latitude: 35.2271, longitude: -80.8431 },
      'raleigh_nc': { latitude: 35.7796, longitude: -78.6382 },
    };

    const key = `${city.toLowerCase()}_${state.toLowerCase()}`;
    
    // Return specific coordinates if city is known
    if (cityCoordinates[key]) {
      return cityCoordinates[key];
    }

    // Generate pseudo-random coordinates based on state for consistency
    return this.generateStateBasedCoordinates(state.toLowerCase());
  }

  /**
   * Generate coordinates within a state's approximate bounds
   * @param state State abbreviation (lowercase)
   * @returns Coordinates within the state
   */
  private generateStateBasedCoordinates(state: string): Coordinates {
    // Approximate center coordinates for US states
    const stateCenters: Record<string, Coordinates> = {
      'al': { latitude: 32.7794, longitude: -86.8287 },
      'ak': { latitude: 64.0685, longitude: -152.2782 },
      'az': { latitude: 34.2744, longitude: -111.2847 },
      'ar': { latitude: 34.9513, longitude: -92.3809 },
      'ca': { latitude: 36.7783, longitude: -119.4179 },
      'co': { latitude: 39.2797, longitude: -105.3272 },
      'ct': { latitude: 41.6219, longitude: -72.7273 },
      'de': { latitude: 38.9108, longitude: -75.5277 },
      'fl': { latitude: 27.7663, longitude: -81.6868 },
      'ga': { latitude: 32.9866, longitude: -83.6487 },
      'hi': { latitude: 21.1098, longitude: -157.5311 },
      'id': { latitude: 44.2394, longitude: -114.5103 },
      'il': { latitude: 40.3363, longitude: -89.0022 },
      'in': { latitude: 39.8647, longitude: -86.2604 },
      'ia': { latitude: 42.0046, longitude: -93.2140 },
      'ks': { latitude: 38.5111, longitude: -96.8005 },
      'ky': { latitude: 37.6690, longitude: -84.6701 },
      'la': { latitude: 31.1801, longitude: -91.8749 },
      'me': { latitude: 44.6074, longitude: -69.3977 },
      'md': { latitude: 39.6399, longitude: -79.0204 },
      'ma': { latitude: 42.2373, longitude: -71.5314 },
      'mi': { latitude: 43.3504, longitude: -84.5603 },
      'mn': { latitude: 45.7326, longitude: -93.9196 },
      'ms': { latitude: 32.7364, longitude: -89.6678 },
      'mo': { latitude: 38.4623, longitude: -92.302 },
      'mt': { latitude: 47.0527, longitude: -110.2148 },
      'ne': { latitude: 41.1289, longitude: -98.2883 },
      'nv': { latitude: 38.4199, longitude: -117.1219 },
      'nh': { latitude: 43.4108, longitude: -71.5653 },
      'nj': { latitude: 40.3140, longitude: -74.5089 },
      'nm': { latitude: 34.8375, longitude: -106.2371 },
      'ny': { latitude: 42.1497, longitude: -74.9384 },
      'nc': { latitude: 35.6411, longitude: -79.8431 },
      'nd': { latitude: 47.5362, longitude: -99.793 },
      'oh': { latitude: 40.3736, longitude: -82.7755 },
      'ok': { latitude: 35.5376, longitude: -96.9247 },
      'or': { latitude: 44.5672, longitude: -122.1269 },
      'pa': { latitude: 40.5773, longitude: -77.264 },
      'ri': { latitude: 41.6762, longitude: -71.5562 },
      'sc': { latitude: 33.8191, longitude: -80.9066 },
      'sd': { latitude: 44.2853, longitude: -99.4632 },
      'tn': { latitude: 35.7449, longitude: -86.7489 },
      'tx': { latitude: 31.106, longitude: -97.6475 },
      'ut': { latitude: 40.1135, longitude: -111.8535 },
      'vt': { latitude: 44.0407, longitude: -72.7093 },
      'va': { latitude: 37.7680, longitude: -78.2057 },
      'wa': { latitude: 47.3917, longitude: -121.5708 },
      'wv': { latitude: 38.4680, longitude: -80.9696 },
      'wi': { latitude: 44.2563, longitude: -89.6385 },
      'wy': { latitude: 42.7475, longitude: -107.2085 },
      'dc': { latitude: 38.9072, longitude: -77.0369 },
    };

    const stateCenter = stateCenters[state] || { latitude: 39.8283, longitude: -98.5795 }; // US center as fallback
    
    // Add small random offset within reasonable bounds (about ±0.5 degrees)
    const latOffset = (Math.random() - 0.5) * 1.0;
    const lonOffset = (Math.random() - 0.5) * 1.0;
    
    return {
      latitude: stateCenter.latitude + latOffset,
      longitude: stateCenter.longitude + lonOffset,
    };
  }

  /**
   * Format address object as a display string
   * @param address Address object
   * @returns Formatted address string
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
