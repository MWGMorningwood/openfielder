# Azure Static Web Apps + Functions with Full Entra Auth & React

## Table of Contents
1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Project Setup](#project-setup)
4. [Authentication Implementation](#authentication-implementation)
5. [Frontend Development](#frontend-development)
6. [Backend Functions](#backend-functions)
7. [Configuration & Security](#configuration--security)
8. [Development Workflow](#development-workflow)
9. [Deployment](#deployment)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

## Overview

This guide provides comprehensive instructions for building Azure Static Web Apps (SWA) with Azure Functions backend, featuring full Entra ID authentication and React-based frontends. This architecture provides:

- **Zero-config Authentication**: Built-in Entra ID integration
- **Serverless Backend**: Cost-effective Azure Functions API
- **Global CDN**: Automatic worldwide distribution
- **Type Safety**: Full TypeScript implementation
- **Security**: Enterprise-grade authentication and authorization

### Architecture Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │────│  Azure SWA       │────│ Azure Functions │
│   (Frontend)    │    │  (Host + Auth)   │    │    (Backend)    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                        ┌──────────────────┐
                        │   Entra ID       │
                        │  (Authentication)│
                        └──────────────────┘
```

## Prerequisites

### Required Tools
```powershell
# Install Node.js (LTS version)
winget install OpenJS.NodeJS.LTS

# Install Azure CLI
winget install Microsoft.AzureCLI

# Install Azure Static Web Apps CLI
npm install -g @azure/static-web-apps-cli

# Install Azure Functions Core Tools
npm install -g azure-functions-core-tools@4 --unsafe-perm true

# Install TypeScript globally
npm install -g typescript
```

### Azure Prerequisites
- **Azure Subscription**: Active subscription with appropriate permissions
- **Entra ID Tenant**: Admin access to configure app registrations
- **Resource Group**: For organizing SWA and Function resources

## Project Setup

### 1. Initialize Project Structure
```powershell
# Create project directory
mkdir my-swa-project
cd my-swa-project

# Initialize SWA project
npx swa init --yes

# Create API directory
mkdir api
cd api
func init . --typescript
cd ..

# Initialize frontend (React + TypeScript + Vite)
npm create vite@latest . -- --template react-ts
```

### 2. Project Structure
```
my-swa-project/
├── api/                          # Azure Functions backend
│   ├── src/
│   │   ├── functions/           # Function endpoints
│   │   │   ├── clients.ts
│   │   │   ├── therapists.ts
│   │   │   └── pairing.ts
│   │   ├── services/            # Business logic
│   │   │   ├── authService.ts
│   │   │   ├── dataService.ts
│   │   │   └── storageService.ts
│   │   ├── types.ts             # Shared type definitions
│   │   └── index.ts
│   ├── host.json
│   ├── local.settings.json
│   ├── package.json
│   └── tsconfig.json
├── src/                         # React frontend
│   ├── components/
│   │   ├── AuthWrapper.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── [other components]
│   ├── services/
│   │   ├── authService.ts
│   │   ├── apiService.ts
│   │   └── [other services]
│   ├── types.ts                 # Frontend types
│   ├── App.tsx
│   └── main.tsx
├── public/
│   └── staticwebapp.config.json # SWA configuration
├── package.json
├── azure.yaml                   # Azure deployment config
└── vite.config.ts
```

### 3. Package Configuration

#### Root package.json
```json
{
  "name": "my-swa-project",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "start": "swa start",
    "start:dev": "swa start --run \"npm run dev\" --api-location api"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.2.0"
  }
}
```

#### API package.json
```json
{
  "name": "api",
  "version": "1.0.0",
  "description": "",
  "scripts": {
    "build": "tsc",
    "watch": "tsc -w",
    "prestart": "npm run build",
    "start": "func start",
    "test": "echo \"No tests yet...\""
  },
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "@azure/data-tables": "^13.0.0",
    "@azure/identity": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "typescript": "^5.2.2"
  }
}
```

## Authentication Implementation

### 1. Static Web App Configuration
Create `public/staticwebapp.config.json`:

```json
{
  "routes": [
    {
      "route": "/login",
      "rewrite": "/.auth/login/aad"
    },
    {
      "route": "/logout", 
      "rewrite": "/.auth/logout"
    },
    {
      "route": "/api/*",
      "allowedRoles": ["authenticated"]
    },
    {
      "route": "/admin/*",
      "allowedRoles": ["admin"]
    }
  ],
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/images/*.{png,jpg,gif}", "/css/*", "/api/*"]
  },
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "userDetailsClaim": "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/{TENANT_ID}/v2.0",
          "clientIdSettingName": "AAD_CLIENT_ID",
          "clientSecretSettingName": "AAD_CLIENT_SECRET"
        }
      }
    }
  },
  "responseOverrides": {
    "401": {
      "redirect": "/.auth/login/aad",
      "statusCode": 302
    }
  }
}
```

### 2. Frontend Auth Service
Create `src/services/authService.ts`:

```typescript
/**
 * Authentication service for Azure Static Web Apps
 * Handles user authentication state and SWA auth endpoints
 */

export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

export interface UserInfo {
  clientPrincipal: ClientPrincipal | null;
}

export class AuthService {
  private static instance: AuthService;
  private clientPrincipal: ClientPrincipal | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Initialize auth service and fetch user info
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      await this.getUserInfo();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize auth service:', error);
      throw error;
    }
  }

  /**
   * Get current user information from SWA auth endpoint
   */
  async getUserInfo(): Promise<ClientPrincipal | null> {
    try {
      const response = await fetch('/.auth/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clientPrincipal = null;
          return null;
        }
        throw new Error(`Auth request failed: ${response.status}`);
      }

      const userInfo: UserInfo = await response.json();
      this.clientPrincipal = userInfo.clientPrincipal;
      return this.clientPrincipal;
    } catch (error) {
      console.error('Failed to get user info:', error);
      this.clientPrincipal = null;
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.clientPrincipal !== null;
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    return this.clientPrincipal?.userRoles?.includes(role) ?? false;
  }

  /**
   * Get current user
   */
  getCurrentUser(): ClientPrincipal | null {
    return this.clientPrincipal;
  }

  /**
   * Get user display name
   */
  getUserDisplayName(): string {
    return this.clientPrincipal?.userDetails || 'Unknown User';
  }

  /**
   * Redirect to login
   */
  login(): void {
    window.location.href = '/.auth/login/aad';
  }

  /**
   * Redirect to logout
   */
  logout(): void {
    window.location.href = '/.auth/logout';
  }

  /**
   * Purge cached auth state (call after logout)
   */
  purgeState(): void {
    this.clientPrincipal = null;
    this.isInitialized = false;
  }
}
```

### 3. Auth Wrapper Component
Create `src/components/AuthWrapper.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { AuthService, type ClientPrincipal } from '../services/authService';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requiredRoles?: string[];
  loadingComponent?: React.ReactNode;
  unauthorizedComponent?: React.ReactNode;
}

export const AuthWrapper: React.FC<AuthWrapperProps> = ({
  children,
  requireAuth = false,
  requiredRoles = [],
  loadingComponent = <div>Loading...</div>,
  unauthorizedComponent = <div>Unauthorized</div>
}) => {
  const [user, setUser] = useState<ClientPrincipal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const authService = AuthService.getInstance();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      await authService.initialize();
      const userInfo = await authService.getUserInfo();
      setUser(userInfo);
      setIsInitialized(true);
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setIsInitialized(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while initializing
  if (isLoading || !isInitialized) {
    return <>{loadingComponent}</>;
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    return (
      <div className="auth-required">
        <h2>Authentication Required</h2>
        <p>You must be logged in to access this content.</p>
        <button onClick={() => authService.login()}>
          Sign In with Microsoft
        </button>
      </div>
    );
  }

  // Check role requirements
  if (requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.some(role => 
      authService.hasRole(role)
    );
    
    if (!hasRequiredRole) {
      return <>{unauthorizedComponent}</>;
    }
  }

  return <>{children}</>;
};
```

### 4. Protected Route Component
Create `src/components/ProtectedRoute.tsx`:

```typescript
import React from 'react';
import { AuthWrapper } from './AuthWrapper';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles = []
}) => {
  return (
    <AuthWrapper
      requireAuth={true}
      requiredRoles={requiredRoles}
      loadingComponent={
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      }
      unauthorizedComponent={
        <div className="unauthorized">
          <h2>Access Denied</h2>
          <p>You don't have permission to access this resource.</p>
          <p>Required roles: {requiredRoles.join(', ')}</p>
        </div>
      }
    >
      {children}
    </AuthWrapper>
  );
};
```

## Frontend Development

### 1. API Service Layer
Create `src/services/apiService.ts`:

```typescript
import { AuthService } from './authService';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

export class ApiService {
  private static instance: ApiService;
  private baseUrl: string;
  private authService: AuthService;

  private constructor() {
    this.baseUrl = '/api';
    this.authService = AuthService.getInstance();
  }

  public static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  /**
   * Make authenticated HTTP request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Ensure user is authenticated
      if (!this.authService.isAuthenticated()) {
        throw new Error('User not authenticated');
      }

      const url = `${this.baseUrl}${endpoint}`;
      const defaultHeaders = {
        'Content-Type': 'application/json',
      };

      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: responseData.message || 'Request failed',
          statusCode: response.status,
        };
      }

      return {
        success: true,
        data: responseData,
        statusCode: response.status,
      };
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }
}
```

### 2. Type Definitions
Create `src/types.ts`:

```typescript
// Shared types between frontend and backend

export interface BaseEntity {
  partitionKey: string;
  rowKey: string;
  timestamp?: Date;
  etag?: string;
}

export interface Client extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: Address;
  preferences?: ClientPreferences;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface Therapist extends BaseEntity {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  licenseNumber: string;
  specialties: string[];
  address?: Address;
  availability?: Availability[];
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface ClientPreferences {
  preferredGender?: 'male' | 'female' | 'no-preference';
  preferredLanguages?: string[];
  maxDistance?: number; // in miles
  sessionType?: 'in-person' | 'virtual' | 'both';
}

export interface Availability {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isAvailable: boolean;
}

export interface PairingRequest extends BaseEntity {
  clientId: string;
  therapistId?: string;
  status: 'pending' | 'matched' | 'completed' | 'cancelled';
  requestDate: Date;
  matchDate?: Date;
  notes?: string;
}

// API Response types
export interface ApiError {
  message: string;
  code?: string;
  details?: any;
}
```

### 3. Main App Component
Update `src/App.tsx`:

```typescript
import React, { useEffect, useState } from 'react';
import { AuthWrapper } from './components/AuthWrapper';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthService } from './services/authService';
import type { ClientPrincipal } from './services/authService';
import './App.css';

function App() {
  const [user, setUser] = useState<ClientPrincipal | null>(null);
  const authService = AuthService.getInstance();

  useEffect(() => {
    // Listen for auth state changes
    const checkAuth = async () => {
      const userInfo = await authService.getUserInfo();
      setUser(userInfo);
    };
    
    checkAuth();
  }, []);

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <div className="App">
      <header className="App-header">
        <nav>
          <h1>My SWA Application</h1>
          <div className="nav-links">
            {user ? (
              <>
                <span>Welcome, {authService.getUserDisplayName()}</span>
                <button onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <button onClick={() => authService.login()}>
                Login with Microsoft
              </button>
            )}
          </div>
        </nav>
      </header>

      <main>
        <AuthWrapper>
          <div className="public-content">
            <h2>Public Content</h2>
            <p>This content is visible to everyone.</p>
          </div>
        </AuthWrapper>

        <ProtectedRoute>
          <div className="protected-content">
            <h2>Protected Content</h2>
            <p>This content requires authentication.</p>
          </div>
        </ProtectedRoute>

        <ProtectedRoute requiredRoles={['admin']}>
          <div className="admin-content">
            <h2>Admin Content</h2>
            <p>This content requires admin role.</p>
          </div>
        </ProtectedRoute>
      </main>
    </div>
  );
}

export default App;
```

## Backend Functions

### 1. Function App Configuration
Create `api/host.json`:

```json
{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "excludedTypes": "Request"
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "functionTimeout": "00:05:00"
}
```

### 2. Local Settings Template
Create `api/local.settings.json`:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "UseDevelopmentStorage=true",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": ""
  }
}
```

### 3. Shared Types
Create `api/src/types.ts`:

```typescript
// Shared types between functions
export interface FunctionContext {
  userId: string;
  userRoles: string[];
  userDetails: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

// Re-export frontend types for consistency
export * from '../../src/types';
```

### 4. Auth Utilities
Create `api/src/services/authService.ts`:

```typescript
import { HttpRequest, InvocationContext } from '@azure/functions';
import { FunctionContext } from '../types';

export class FunctionAuthService {
  /**
   * Extract user context from SWA headers
   */
  static getUserContext(request: HttpRequest): FunctionContext | null {
    try {
      const clientPrincipalHeader = request.headers.get('x-ms-client-principal');
      
      if (!clientPrincipalHeader) {
        return null;
      }

      // Decode base64 client principal
      const clientPrincipal = JSON.parse(
        Buffer.from(clientPrincipalHeader, 'base64').toString('utf8')
      );

      return {
        userId: clientPrincipal.userId,
        userRoles: clientPrincipal.userRoles || [],
        userDetails: clientPrincipal.userDetails || 'Unknown User',
      };
    } catch (error) {
      console.error('Failed to parse client principal:', error);
      return null;
    }
  }

  /**
   * Check if user has required role
   */
  static hasRole(context: FunctionContext, requiredRole: string): boolean {
    return context.userRoles.includes(requiredRole);
  }

  /**
   * Require authentication middleware
   */
  static requireAuth(request: HttpRequest): FunctionContext {
    const context = this.getUserContext(request);
    
    if (!context) {
      throw new Error('Authentication required');
    }
    
    return context;
  }

  /**
   * Require specific role middleware
   */
  static requireRole(request: HttpRequest, role: string): FunctionContext {
    const context = this.requireAuth(request);
    
    if (!this.hasRole(context, role)) {
      throw new Error(`Role '${role}' required`);
    }
    
    return context;
  }
}
```

### 5. Data Service
Create `api/src/services/dataService.ts`:

```typescript
import { TableClient, TableEntity } from '@azure/data-tables';
import { DefaultAzureCredential } from '@azure/identity';
import { Client, Therapist, PairingRequest } from '../types';

export class DataService {
  private static instance: DataService;
  private clientsTable: TableClient;
  private therapistsTable: TableClient;
  private pairingsTable: TableClient;

  private constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING not configured');
    }

    this.clientsTable = TableClient.fromConnectionString(connectionString, 'Clients');
    this.therapistsTable = TableClient.fromConnectionString(connectionString, 'Therapists');
    this.pairingsTable = TableClient.fromConnectionString(connectionString, 'Pairings');
  }

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  /**
   * Initialize tables if they don't exist
   */
  async initializeTables(): Promise<void> {
    try {
      await Promise.all([
        this.clientsTable.createTable(),
        this.therapistsTable.createTable(),
        this.pairingsTable.createTable(),
      ]);
    } catch (error) {
      // Tables might already exist, which is fine
      console.log('Tables initialization completed');
    }
  }

  // Client operations
  async createClient(client: Omit<Client, 'timestamp' | 'etag'>): Promise<Client> {
    const entity: TableEntity = {
      partitionKey: client.partitionKey,
      rowKey: client.rowKey,
      ...client,
    };

    const response = await this.clientsTable.createEntity(entity);
    return { ...client, timestamp: response.date, etag: response.etag };
  }

  async getClient(partitionKey: string, rowKey: string): Promise<Client | null> {
    try {
      const entity = await this.clientsTable.getEntity<Client>(partitionKey, rowKey);
      return entity;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async listClients(partitionKey?: string): Promise<Client[]> {
    const entities: Client[] = [];
    const filter = partitionKey ? `PartitionKey eq '${partitionKey}'` : undefined;
    
    for await (const entity of this.clientsTable.listEntities<Client>({ queryOptions: { filter } })) {
      entities.push(entity);
    }
    
    return entities;
  }

  async updateClient(client: Client): Promise<Client> {
    const entity: TableEntity = {
      partitionKey: client.partitionKey,
      rowKey: client.rowKey,
      ...client,
      updatedAt: new Date(),
    };

    const response = await this.clientsTable.updateEntity(entity, 'Merge');
    return { ...client, timestamp: response.date, etag: response.etag };
  }

  async deleteClient(partitionKey: string, rowKey: string): Promise<void> {
    await this.clientsTable.deleteEntity(partitionKey, rowKey);
  }

  // Therapist operations (similar pattern)
  async createTherapist(therapist: Omit<Therapist, 'timestamp' | 'etag'>): Promise<Therapist> {
    const entity: TableEntity = {
      partitionKey: therapist.partitionKey,
      rowKey: therapist.rowKey,
      ...therapist,
    };

    const response = await this.therapistsTable.createEntity(entity);
    return { ...therapist, timestamp: response.date, etag: response.etag };
  }

  async getTherapist(partitionKey: string, rowKey: string): Promise<Therapist | null> {
    try {
      const entity = await this.therapistsTable.getEntity<Therapist>(partitionKey, rowKey);
      return entity;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async listTherapists(partitionKey?: string): Promise<Therapist[]> {
    const entities: Therapist[] = [];
    const filter = partitionKey ? `PartitionKey eq '${partitionKey}'` : undefined;
    
    for await (const entity of this.therapistsTable.listEntities<Therapist>({ queryOptions: { filter } })) {
      entities.push(entity);
    }
    
    return entities;
  }

  // Pairing operations
  async createPairing(pairing: Omit<PairingRequest, 'timestamp' | 'etag'>): Promise<PairingRequest> {
    const entity: TableEntity = {
      partitionKey: pairing.partitionKey,
      rowKey: pairing.rowKey,
      ...pairing,
    };

    const response = await this.pairingsTable.createEntity(entity);
    return { ...pairing, timestamp: response.date, etag: response.etag };
  }

  async getPairing(partitionKey: string, rowKey: string): Promise<PairingRequest | null> {
    try {
      const entity = await this.pairingsTable.getEntity<PairingRequest>(partitionKey, rowKey);
      return entity;
    } catch (error: any) {
      if (error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
}
```

### 6. Example Function - Clients
Create `api/src/functions/clients.ts`:

```typescript
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { FunctionAuthService } from '../services/authService';
import { DataService } from '../services/dataService';
import { Client, ApiResponse, ValidationError } from '../types';

/**
 * HTTP trigger function for client management
 */
async function clientsFunction(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const method = request.method.toUpperCase();
  
  try {
    // Require authentication for all client operations
    const userContext = FunctionAuthService.requireAuth(request);
    context.log(`User ${userContext.userId} accessing clients endpoint`);

    const dataService = DataService.getInstance();
    await dataService.initializeTables();

    switch (method) {
      case 'GET':
        return await handleGetClients(request, userContext, dataService);
      case 'POST':
        return await handleCreateClient(request, userContext, dataService);
      case 'PUT':
        return await handleUpdateClient(request, userContext, dataService);
      case 'DELETE':
        return await handleDeleteClient(request, userContext, dataService);
      default:
        return createResponse(false, null, 'Method not allowed', 405);
    }
  } catch (error: any) {
    context.log.error('Clients function error:', error);
    
    if (error.message === 'Authentication required') {
      return createResponse(false, null, 'Authentication required', 401);
    }
    
    return createResponse(false, null, 'Internal server error', 500);
  }
}

async function handleGetClients(
  request: HttpRequest,
  userContext: any,
  dataService: DataService
): Promise<HttpResponseInit> {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('id');

  if (clientId) {
    // Get specific client
    const client = await dataService.getClient('CLIENT', clientId);
    if (!client) {
      return createResponse(false, null, 'Client not found', 404);
    }
    return createResponse(true, client);
  } else {
    // List all clients (admin only)
    if (!FunctionAuthService.hasRole(userContext, 'admin')) {
      return createResponse(false, null, 'Admin role required', 403);
    }
    
    const clients = await dataService.listClients('CLIENT');
    return createResponse(true, clients);
  }
}

async function handleCreateClient(
  request: HttpRequest,
  userContext: any,
  dataService: DataService
): Promise<HttpResponseInit> {
  try {
    const clientData = await request.json() as Partial<Client>;
    
    // Validate input
    const validationErrors = validateClientData(clientData);
    if (validationErrors.length > 0) {
      return createResponse(false, validationErrors, 'Validation failed', 400);
    }

    // Create client entity
    const client: Omit<Client, 'timestamp' | 'etag'> = {
      partitionKey: 'CLIENT',
      rowKey: generateClientId(),
      firstName: clientData.firstName!,
      lastName: clientData.lastName!,
      email: clientData.email!,
      phone: clientData.phone,
      address: clientData.address,
      preferences: clientData.preferences,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const savedClient = await dataService.createClient(client);
    return createResponse(true, savedClient, 'Client created successfully', 201);
  } catch (error) {
    return createResponse(false, null, 'Failed to create client', 400);
  }
}

async function handleUpdateClient(
  request: HttpRequest,
  userContext: any,
  dataService: DataService
): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('id');
    
    if (!clientId) {
      return createResponse(false, null, 'Client ID required', 400);
    }

    const existingClient = await dataService.getClient('CLIENT', clientId);
    if (!existingClient) {
      return createResponse(false, null, 'Client not found', 404);
    }

    const updateData = await request.json() as Partial<Client>;
    const updatedClient: Client = {
      ...existingClient,
      ...updateData,
      updatedAt: new Date(),
    };

    const savedClient = await dataService.updateClient(updatedClient);
    return createResponse(true, savedClient, 'Client updated successfully');
  } catch (error) {
    return createResponse(false, null, 'Failed to update client', 400);
  }
}

async function handleDeleteClient(
  request: HttpRequest,
  userContext: any,
  dataService: DataService
): Promise<HttpResponseInit> {
  // Require admin role for deletion
  if (!FunctionAuthService.hasRole(userContext, 'admin')) {
    return createResponse(false, null, 'Admin role required', 403);
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get('id');
  
  if (!clientId) {
    return createResponse(false, null, 'Client ID required', 400);
  }

  try {
    await dataService.deleteClient('CLIENT', clientId);
    return createResponse(true, null, 'Client deleted successfully');
  } catch (error) {
    return createResponse(false, null, 'Failed to delete client', 400);
  }
}

function validateClientData(data: Partial<Client>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data.firstName?.trim()) {
    errors.push({ field: 'firstName', message: 'First name is required' });
  }

  if (!data.lastName?.trim()) {
    errors.push({ field: 'lastName', message: 'Last name is required' });
  }

  if (!data.email?.trim()) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  return errors;
}

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createResponse<T>(
  success: boolean,
  data?: T,
  message?: string,
  statusCode: number = 200
): HttpResponseInit {
  const response: ApiResponse<T> = {
    success,
    data,
    error: success ? undefined : message,
    timestamp: new Date().toISOString(),
  };

  return {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(response),
  };
}

// Register the function
app.http('clients', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous', // Auth handled by SWA
  handler: clientsFunction,
});
```

## Configuration & Security

### 1. Environment Variables
Set up environment variables for production:

```bash
# Storage connection
AZURE_STORAGE_CONNECTION_STRING="DefaultEndpointsProtocol=https;AccountName=<account>;AccountKey=<key>"

# Application Insights
APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=<key>;IngestionEndpoint=<endpoint>"

# Entra ID Configuration (set in SWA configuration)
AAD_CLIENT_ID="<your-client-id>"
AAD_CLIENT_SECRET="<your-client-secret>"
```

### 2. Security Best Practices

#### Function Security
```typescript
// api/src/utils/security.ts
export class SecurityUtils {
  /**
   * Sanitize input to prevent injection attacks
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove HTML tags
      .trim()
      .substring(0, 1000); // Limit length
  }

  /**
   * Validate partition/row keys
   */
  static validateKey(key: string): boolean {
    // Azure Table Storage key requirements
    const invalidChars = /[\/\\#?]/;
    return !invalidChars.test(key) && key.length <= 1024;
  }

  /**
   * Rate limiting check (implement with external store)
   */
  static async checkRateLimit(userId: string, operation: string): Promise<boolean> {
    // Implement rate limiting logic
    return true;
  }
}
```

#### CORS Configuration
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
```

## Development Workflow

### 1. Local Development Setup
```powershell
# Install dependencies
npm install
cd api && npm install && cd ..

# Start local development
npm run start:dev

# Or start components separately
# Terminal 1: Start SWA CLI
npx swa start --run "npm run dev" --api-location api

# Terminal 2: Start Functions (if needed separately)
cd api && npm run start
```

### 2. Environment Configuration
Create `.env.local`:
```
VITE_API_BASE_URL=http://localhost:4280
VITE_ENVIRONMENT=development
```

### 3. Testing Strategy

#### Unit Tests (Frontend)
```typescript
// src/services/__tests__/authService.test.ts
import { AuthService } from '../authService';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = AuthService.getInstance();
    // Mock fetch for tests
    global.fetch = jest.fn();
  });

  test('should initialize singleton instance', () => {
    const instance1 = AuthService.getInstance();
    const instance2 = AuthService.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should handle successful user info fetch', async () => {
    const mockUserInfo = {
      clientPrincipal: {
        identityProvider: 'aad',
        userId: 'test-user-id',
        userDetails: 'test@example.com',
        userRoles: ['authenticated'],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUserInfo),
    });

    const result = await authService.getUserInfo();
    expect(result).toEqual(mockUserInfo.clientPrincipal);
  });
});
```

#### Integration Tests (Functions)
```typescript
// api/src/__tests__/clients.integration.test.ts
import { HttpRequest } from '@azure/functions';
import { clientsFunction } from '../functions/clients';

describe('Clients Function Integration', () => {
  test('should require authentication', async () => {
    const request = new HttpRequest({
      method: 'GET',
      url: 'http://localhost/api/clients',
      headers: {},
    });

    const response = await clientsFunction(request, {} as any);
    expect(response.status).toBe(401);
  });

  test('should return clients for authenticated user', async () => {
    const mockPrincipal = {
      identityProvider: 'aad',
      userId: 'test-user',
      userDetails: 'test@example.com',
      userRoles: ['authenticated', 'admin'],
    };

    const request = new HttpRequest({
      method: 'GET',
      url: 'http://localhost/api/clients',
      headers: {
        'x-ms-client-principal': Buffer.from(JSON.stringify(mockPrincipal)).toString('base64'),
      },
    });

    const response = await clientsFunction(request, {} as any);
    expect(response.status).toBe(200);
  });
});
```

## Deployment

### 1. Azure Deployment Configuration
Create `azure.yaml`:
```yaml
name: my-swa-project
metadata:
  template: staticwebapp@0.0.1-beta
services:
  web:
    project: .
    dist: dist
    host: staticwebapp
    language: js
hooks:
  postprovision:
    shell: pwsh
    run: |
      echo "Configuring Entra ID authentication..."
      # Add any post-provision scripts here
```

### 2. Deployment Script
Create `scripts/deploy.ps1`:
```powershell
#!/usr/bin/env pwsh

param(
    [Parameter(Mandatory=$true)]
    [string]$Environment,
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "rg-myapp-$Environment",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "Central US"
)

Write-Host "Deploying to environment: $Environment" -ForegroundColor Green

# Build the application
Write-Host "Building application..." -ForegroundColor Blue
npm run build

# Build the API
Write-Host "Building API..." -ForegroundColor Blue
cd api
npm run build
cd ..

# Deploy with SWA CLI
Write-Host "Deploying to Azure..." -ForegroundColor Blue
npx swa deploy --env $Environment

Write-Host "Deployment completed!" -ForegroundColor Green
```

### 3. CI/CD Pipeline (GitHub Actions)
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Azure Static Web Apps

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
      with:
        submodules: true
        
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: |
        npm ci
        cd api && npm ci
        
    - name: Build application
      run: npm run build
      
    - name: Build API
      run: |
        cd api
        npm run build
        
    - name: Deploy to Azure SWA
      uses: Azure/static-web-apps-deploy@v1
      with:
        azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
        repo_token: ${{ secrets.GITHUB_TOKEN }}
        action: "upload"
        app_location: "/"
        api_location: "api"
        output_location: "dist"
```

## Best Practices

### 1. Security Best Practices
- **Always use HTTPS**: SWA provides this automatically
- **Validate all inputs**: Sanitize and validate in both frontend and backend
- **Use least privilege**: Assign minimal necessary roles
- **Implement rate limiting**: Protect against abuse
- **Log security events**: Monitor for suspicious activity
- **Keep dependencies updated**: Regular security updates

### 2. Performance Best Practices
- **Implement caching**: Use browser cache and service-level caching
- **Optimize bundle size**: Code splitting and tree shaking
- **Use CDN**: SWA provides global CDN automatically
- **Lazy load components**: Load components as needed
- **Optimize images**: Use appropriate formats and sizes
- **Minimize API calls**: Batch operations when possible

### 3. Development Best Practices
- **Type safety**: Use TypeScript throughout the stack
- **Error handling**: Comprehensive error handling and logging
- **Testing**: Unit, integration, and E2E tests
- **Code quality**: Linting, formatting, and code reviews
- **Documentation**: Keep documentation updated
- **Version control**: Use semantic versioning

### 4. Monitoring & Observability
```typescript
// Enhanced logging service
export class LoggingService {
  static logUserAction(action: string, userId: string, metadata?: any): void {
    console.log({
      timestamp: new Date().toISOString(),
      action,
      userId,
      metadata,
      level: 'INFO'
    });
  }

  static logError(error: Error, context?: string): void {
    console.error({
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context,
      level: 'ERROR'
    });
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Authentication Not Working
**Problem**: Users can't authenticate or authentication state is inconsistent  
**Solutions**:
- Check Entra ID app registration configuration
- Verify `staticwebapp.config.json` auth settings
- Ensure correct redirect URIs are configured
- Check browser console for CORS errors

#### 2. API Functions Not Accessible
**Problem**: Frontend can't reach API functions  
**Solutions**:
- Verify function deployment and configuration
- Check `host.json` and function bindings
- Ensure proper authentication headers
- Validate SWA routing configuration

#### 3. Local Development Issues
**Problem**: Authentication doesn't work locally  
**Solutions**:
- Use SWA CLI for local development
- Configure local authentication simulation
- Check port configurations and proxy settings

#### 4. Deployment Failures
**Problem**: Deployment fails or application doesn't work after deployment  
**Solutions**:
- Check build logs for errors
- Verify environment variables are set
- Ensure all dependencies are included
- Check Azure resource permissions

### Debugging Tools
```typescript
// Debug utilities
export class DebugUtils {
  static logAuthState(): void {
    const authService = AuthService.getInstance();
    console.log('Auth State:', {
      isAuthenticated: authService.isAuthenticated(),
      user: authService.getCurrentUser(),
      timestamp: new Date().toISOString()
    });
  }

  static async testApiConnection(): Promise<void> {
    try {
      const response = await fetch('/api/health');
      console.log('API Connection:', response.status, response.statusText);
    } catch (error) {
      console.error('API Connection Failed:', error);
    }
  }
}
```

---

## Conclusion

This comprehensive guide provides a complete foundation for building Azure Static Web Apps with Azure Functions backend, featuring full Entra ID authentication and React frontend. The architecture provides enterprise-grade security, scalability, and developer experience while maintaining cost-effectiveness through serverless technologies.

Key takeaways:
- **Zero-config authentication** with Entra ID integration
- **Type-safe development** with TypeScript across the stack
- **Scalable architecture** with serverless Functions backend
- **Security-first approach** with built-in SWA security features
- **Modern development workflow** with Vite and hot reload
- **Production-ready deployment** with CI/CD automation

For additional support and advanced scenarios, refer to the [Azure Static Web Apps documentation](https://docs.microsoft.com/en-us/azure/static-web-apps/) and [Azure Functions documentation](https://docs.microsoft.com/en-us/azure/azure-functions/).

Last Updated: June 11, 2025
