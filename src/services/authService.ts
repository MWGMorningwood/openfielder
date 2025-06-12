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
  }  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.clientPrincipal?.userRoles.includes(role) || false;
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