import type { Address } from '../types';
import { DefaultAzureCredential } from '@azure/identity';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Geocoding service for converting addresses to coordinates
 * Uses Azure Maps with Entra ID authentication (DefaultAzureCredential only)
 */
export class GeocodingService {
  private credential: DefaultAzureCredential;
  private mapsClientId: string;
  constructor() {
    console.log('🔧 Initializing GeocodingService...');
    
    // Get Azure Maps client ID from environment
    this.mapsClientId = process.env.AZURE_MAPS_CLIENT_ID || '';
    
    console.log('📋 Configuration check:', {
      mapsClientId: this.mapsClientId ? '✅ Set' : '❌ Missing',
      nodeEnv: process.env.NODE_ENV || 'undefined',
      azureClientId: process.env.AZURE_CLIENT_ID ? '✅ Set' : '❌ Missing',
      azureTenantId: process.env.AZURE_TENANT_ID ? '✅ Set' : '❌ Missing'
    });

    if (!this.mapsClientId) {
      throw new Error('AZURE_MAPS_CLIENT_ID environment variable is required');
    }

    // Initialize DefaultAzureCredential only
    try {
      this.credential = new DefaultAzureCredential({
        // Enable additional logging for debugging
        loggingOptions: {
          allowLoggingAccountIdentifiers: true
        }
      });
      console.log('✅ DefaultAzureCredential initialized');
    } catch (credError) {
      console.error('❌ Failed to initialize DefaultAzureCredential:', credError);
      throw new Error(`Failed to initialize Azure credentials: ${credError instanceof Error ? credError.message : String(credError)}`);
    }
  }/**
   * Convert an address to coordinates
   * @param address The address to geocode
   * @returns Promise resolving to coordinates
   */
  public async geocodeAddress(address: Address): Promise<Coordinates> {
    // Ensure Azure Maps credentials are available
    if (!this.mapsClientId) {
      throw new Error('Azure Maps client ID not configured. Please set AZURE_MAPS_CLIENT_ID environment variable.');
    }
    
    try {
      const coordinates = await this.retryOperation(() => this.geocodeWithAzureMaps(address));
      console.log(`Successfully geocoded "${this.formatAddressForDisplay(address)}" to ${coordinates.latitude}, ${coordinates.longitude}`);
      return coordinates;
    } catch (error) {
      const addressStr = this.formatAddressForDisplay(address);
      console.error(`Failed to geocode address "${addressStr}":`, error);
      throw new Error(`Failed to geocode address "${addressStr}": ${error instanceof Error ? error.message : String(error)}`);
    }
  }  /**
   * Get access token for Azure Maps using DefaultAzureCredential only
   */
  private async getAccessToken(): Promise<string> {
    try {
      console.log('🔐 Attempting to get Azure access token using DefaultAzureCredential...');
      
      // Try different scopes for Azure Maps
      const scopes = [
        'https://atlas.microsoft.com/.default',
        'https://atlas.microsoft.com/user_impersonation',
        'https://management.azure.com/.default'
      ];
      
      for (const scope of scopes) {
        try {
          console.log(`🔍 Trying scope: ${scope}`);
          const tokenResponse = await this.credential.getToken(scope);
          
          if (tokenResponse && tokenResponse.token) {
            console.log(`✅ Successfully obtained access token with scope: ${scope}`);
            console.log(`   Token expires: ${new Date(tokenResponse.expiresOnTimestamp).toISOString()}`);
            return tokenResponse.token;
          }
        } catch (scopeError) {
          console.log(`❌ Failed with scope ${scope}:`, scopeError);
          continue;
        }
      }
      
      throw new Error('Failed to get access token with any scope');
    } catch (error) {
      console.error('❌ Failed to get Azure access token:', error);
      console.error('💡 Ensure you are logged in via Azure CLI or have proper managed identity configured');
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * Retry logic for geocoding requests with exponential backoff and jitter
   * @param operation Function to retry
   * @param maxRetries Maximum number of retries
   * @param delay Initial delay between retries in milliseconds
   * @returns Promise resolving to operation result
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          console.error(`❌ Operation failed after ${maxRetries} retries:`, lastError.message);
          break; // Don't wait after the last attempt
        }
        
        // Only retry on specific error conditions
        const shouldRetry = this.isRetryableError(lastError);
        if (!shouldRetry) {
          console.error(`❌ Non-retryable error encountered:`, lastError.message);
          throw lastError;
        }
        
        // Calculate exponential backoff with jitter
        const backoffDelay = delay * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`⚠️  Geocoding attempt ${attempt + 1} failed, retrying in ${Math.round(backoffDelay)}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
    
    throw lastError!;
  }

  /**
   * Determine if an error is retryable based on Azure best practices
   * @param error The error to check
   * @returns True if the error should be retried
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Retry on network-related errors
    if (message.includes('fetch') || 
        message.includes('network') || 
        message.includes('timeout') ||
        message.includes('connection')) {
      return true;
    }
    
    // Retry on specific HTTP status codes (5xx server errors, 429 rate limit)
    if (message.includes('500') || 
        message.includes('502') || 
        message.includes('503') || 
        message.includes('504') ||
        message.includes('429')) {
      return true;
    }
    
    // Retry on authentication token expiration
    if (message.includes('401') || message.includes('unauthorized')) {
      return true;
    }
    
    // Don't retry on client errors (4xx except 401 and 429)
    if (message.includes('400') || 
        message.includes('403') || 
        message.includes('404')) {
      return false;
    }
    
    return false;
  }/**
   * Geocode address using Azure Maps API with proper Entra ID authentication
   * @param address Address to geocode
   * @returns Promise resolving to coordinates
   */  private async geocodeWithAzureMaps(address: Address): Promise<Coordinates> {
    const addressString = this.formatAddressForGeocoding(address);
    
    try {
      console.log(`🗺️  Attempting to geocode "${addressString}" with Azure Maps Geocoding API...`);
        // Get access token for Azure Maps using managed identity/credential
      const accessToken = await this.getAccessToken();
      
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
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/geo+json',
          'x-ms-client-id': this.mapsClientId
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
