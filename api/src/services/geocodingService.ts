import type { Address } from '../types';
import { azureMapsAuthService } from './azureMapsAuthService';
import { RetryUtilityService } from './retryUtilityService';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Geocoding service for converting addresses to coordinates
 * Uses Azure Maps with Entra ID authentication via shared auth service
 */
export class GeocodingService {
  constructor() {
    console.log('🔧 Initializing GeocodingService...');
    console.log('✅ Using shared AzureMapsAuthService for authentication');
  }/**
   * Convert an address to coordinates
   * @param address The address to geocode
   * @returns Promise resolving to coordinates
   */  public async geocodeAddress(address: Address): Promise<Coordinates> {
    try {
      const coordinates = await RetryUtilityService.retryOperation(() => this.geocodeWithAzureMaps(address));
      console.log(`Successfully geocoded "${this.formatAddressForDisplay(address)}" to ${coordinates.latitude}, ${coordinates.longitude}`);
      return coordinates;
    } catch (error) {
      const addressStr = this.formatAddressForDisplay(address);
      console.error(`Failed to geocode address "${addressStr}":`, error);
      throw new Error(`Failed to geocode address "${addressStr}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }/**
   * Geocode address using Azure Maps API with shared authentication service
   * @param address Address to geocode
   * @returns Promise resolving to coordinates
   */
  private async geocodeWithAzureMaps(address: Address): Promise<Coordinates> {
    const addressString = this.formatAddressForGeocoding(address);
    
    try {
      console.log(`🗺️  Attempting to geocode "${addressString}" with Azure Maps Geocoding API...`);
      
      // Get authenticated headers from shared service
      const headers = await azureMapsAuthService.getAuthHeaders();
      
      // Use structured address parameters for better accuracy (recommended approach)
      const params = new URLSearchParams({
        'api-version': '2025-01-01',
        'addressLine': `${address.street1}${address.street2 ? ' ' + address.street2 : ''}`,
        'locality': address.city,
        'adminDistrict': address.state,
        'postalCode': address.zipCode,
        'countryRegion': 'US',
        'top': '1'
      });
      
      const url = `https://atlas.microsoft.com/geocode?${params.toString()}`;
      
      console.log(`🔗 Request URL: ${url.replace(/addressLine=[^&]+/, 'addressLine=[REDACTED]')}`);
      console.log(`📦 Address components:`, {
        addressLine: `${address.street1}${address.street2 ? ' ' + address.street2 : ''}`,
        locality: address.city,
        adminDistrict: address.state,
        postalCode: address.zipCode,
        countryRegion: 'US'
      });
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...headers,
          'Accept': 'application/geo+json'
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Azure Maps Geocoding API error response:`, {
          status: response.status,
          statusText: response.statusText,
          errorText: errorText,
          url: url.replace(encodeURIComponent(addressString), '[ADDRESS]') // Hide address in logs
        });
        throw new Error(`Azure Maps Geocoding API error: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Parse GeoJSON response format
      const data = await response.json() as {
        type: 'FeatureCollection';
        features?: Array<{
          type: 'Feature';
          geometry: {
            type: 'Point';
            coordinates: [number, number]; // [longitude, latitude]
          };
          properties: {
            address?: {
              formattedAddress?: string;
            };
            confidence?: 'High' | 'Medium' | 'Low';
            matchCodes?: string[];
            type?: string;
          };
        }>;
      };
      
      if (!data.features || data.features.length === 0) {
        throw new Error(`No geocoding results found for address: ${addressString}`);
      }
      
      const feature = data.features[0];
      const [longitude, latitude] = feature.geometry.coordinates;
      
      const coordinates = {
        latitude,
        longitude,
      };
      
      console.log(`✅ Azure Maps geocoded "${addressString}" to ${coordinates.latitude}, ${coordinates.longitude}`);
      if (feature.properties?.address?.formattedAddress) {
        console.log(`   📍 Matched address: ${feature.properties.address.formattedAddress}`);
      }
      if (feature.properties?.confidence) {
        console.log(`   🎯 Confidence: ${feature.properties.confidence}`);
      }
      
      return coordinates;
    } catch (error) {
      console.error(`❌ Azure Maps geocoding error for "${addressString}":`, error);
      throw error;
    }
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
