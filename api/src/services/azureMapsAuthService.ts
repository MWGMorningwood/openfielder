import { DefaultAzureCredential } from '@azure/identity';

/**
 * Shared Azure Maps authentication service
 * Handles token acquisition and Azure Maps client configuration
 * 
 * SECURITY NOTE: ONLY uses Azure Managed Identity for authentication.
 * SUBSCRIPTION KEYS ARE EXPLICITLY FORBIDDEN for security reasons.
 */
export class AzureMapsAuthService {
  private credential: DefaultAzureCredential;
  private mapsClientId: string;
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor() {
    console.log('🔧 Initializing AzureMapsAuthService...');
    
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
  }

  /**
   * Get Azure Maps client ID
   */
  public getClientId(): string {
    return this.mapsClientId;
  }

  /**
   * Get access token for Azure Maps using DefaultAzureCredential only
   * Implements caching to avoid unnecessary token requests
   */
  public async getAccessToken(): Promise<string> {
    // Check if we have a valid cached token
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      console.log('🔄 Using cached Azure Maps access token');
      return this.tokenCache.token;
    }

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
            
            // Cache the token with a buffer (expire 5 minutes early)
            this.tokenCache = {
              token: tokenResponse.token,
              expiresAt: tokenResponse.expiresOnTimestamp - (5 * 60 * 1000)
            };
            
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
   * Create authenticated headers for Azure Maps API calls
   */
  public async getAuthHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${accessToken}`,
      'x-ms-client-id': this.mapsClientId,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Clear the token cache (useful for testing or error recovery)
   */
  public clearTokenCache(): void {
    this.tokenCache = null;
    console.log('🗑️ Azure Maps token cache cleared');
  }
}

// Singleton instance
export const azureMapsAuthService = new AzureMapsAuthService();
