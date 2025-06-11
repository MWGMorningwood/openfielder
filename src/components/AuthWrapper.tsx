import React, { useEffect, useState } from 'react';
import { AuthService, type ClientPrincipal } from '../services/authService';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  const [user, setUser] = useState<ClientPrincipal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authService = AuthService.getInstance();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userInfo = await authService.getUserInfo();
      setUser(userInfo);
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogin = () => {
    authService.login();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">OpenFielder</h1>
            <p className="text-gray-600 mb-6">
              Please sign in to access the therapist-client mapping system.
            </p>
            <button
              onClick={handleLogin}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Sign In with Microsoft
            </button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div>
      {children}
    </div>
  );
};
