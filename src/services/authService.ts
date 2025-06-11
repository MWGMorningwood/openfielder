/**
 * Authentication service for Azure Static Web Apps
 * Uses the built-in SWA authentication endpoints
 */

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

export class AuthService {
  private static instance: AuthService;
  private clientPrincipal: ClientPrincipal | null = null;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Get the current user information from Static Web Apps
   */
  async getUserInfo(): Promise<ClientPrincipal | null> {
    try {
      const response = await fetch('/.auth/me');
      if (!response.ok) {
        return null;
      }
      
      const authData = await response.json();
      if (authData.clientPrincipal) {
        this.clientPrincipal = authData.clientPrincipal;
        return this.clientPrincipal;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user info:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const userInfo = await this.getUserInfo();
    return userInfo !== null;
  }
  /**
   * Get Azure Maps access token directly using Entra authentication
   * This leverages the user's authenticated session from Static Web Apps
   */
  async getAzureMapsToken(): Promise<string | null> {
    if (!this.clientPrincipal) {
      await this.getUserInfo();
    }
    
    if (!this.clientPrincipal) {
      return null;
    }

    // Get token for Azure Maps directly from the browser using the authenticated session
    // Static Web Apps will handle the token exchange automatically
    try {
      // Request an access token for Azure Maps scope
      const response = await fetch('/.auth/me');
      if (!response.ok) {
        throw new Error('Failed to get authentication info');
      }
      
      const authData = await response.json();
      
      // For Azure Maps, we can use the access token directly
      // The Static Web App authentication provides the necessary claims
      return authData.clientPrincipal?.accessToken || null;
    } catch (error) {
      console.error('Error getting Azure Maps token:', error);
      return null;
    }
  }

  /**
   * Get the client ID for Azure Maps authentication
   */
  getClientId(): string {
    return import.meta.env.VITE_AZURE_CLIENT_ID || '';
  }

  /**
   * Login redirect
   */
  login(): void {
    window.location.href = '/.auth/login/aad';
  }

  /**
   * Logout
   */
  logout(): void {
    window.location.href = '/.auth/logout';
  }

  /**
   * Get current user
   */
  getCurrentUser(): ClientPrincipal | null {
    return this.clientPrincipal;
  }
}