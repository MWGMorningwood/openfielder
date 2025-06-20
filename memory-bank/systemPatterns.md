# System Patterns

## Code Patterns & Architectural Decisions

### Authentication Architecture
- **Azure Static Web Apps (SWA) Built-in Authentication**: Using Entra ID (AAD) provider
- **Client Principal Pattern**: Utilizing SWA's `/.auth/me` endpoint for user information
- **Singleton Auth Service**: Centralized authentication management with caching
- **Role-based Access Control**: Using SWA's built-in role system with `allowedRoles`

### API Architecture  
- **Azure Functions API**: TypeScript-based serverless functions
- **Service Layer Pattern**: Separation of concerns with dedicated service classes
- **Dependency Injection**: Service instantiation patterns for testability
- **Error Handling**: Consistent error responses and logging

### Frontend Architecture
- **React + TypeScript**: Type-safe component development
- **Vite Build System**: Fast development and optimized production builds
- **Component Composition**: HOC pattern with AuthWrapper for protected routes
- **Service Layer**: Centralized API communication and auth management

### Data Patterns
- **Azure Table Storage**: NoSQL entity storage with partition/row key strategy
- **Geocoding Integration**: Azure Maps API with DefaultAzureCredential authentication
- **Error Handling**: Exponential backoff retry logic for external service calls
- **Type Safety**: Shared TypeScript interfaces between client and API

### Geocoding Implementation Patterns
- **Structured Address Parameters**: Using `addressLine`, `locality`, `adminDistrict`, `postalCode`, `countryRegion` for Azure Maps
- **Retry Logic**: Exponential backoff with jitter for transient failures
- **Authentication**: DefaultAzureCredential with multiple scope fallbacks
- **Response Parsing**: GeoJSON format with coordinate extraction from `[longitude, latitude]` arrays
- **Error Classification**: Retryable vs non-retryable error detection

### Map Component Patterns
- **Promise-based Readiness**: Using ref-stored promises for async map initialization
- **Timing Safety**: Buffer delays after map ready events before adding sources/layers
- **Error Recovery**: Try-catch blocks with graceful degradation for map operations
- **State Management**: Separate ready state and promise coordination for React lifecycle

## Naming Conventions

### Files & Directories
- **Components**: PascalCase (e.g., `AuthWrapper.tsx`, `MapComponent.tsx`)
- **Services**: camelCase with Service suffix (e.g., `authService.ts`, `apiService.ts`)
- **Types**: camelCase with .ts extension (e.g., `types.ts`)
- **Functions**: camelCase (e.g., `clients.ts`, `therapists.ts`)

### Code Conventions
- **Interfaces**: PascalCase with descriptive names (e.g., `ClientPrincipal`, `AuthWrapperProps`)
- **Classes**: PascalCase (e.g., `AuthService`, `OpenFielderService`)
- **Variables/Functions**: camelCase (e.g., `getUserInfo`, `checkAuth`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)

### Azure Resources
- **Resource Groups**: `rg-{project}-{environment}`
- **Static Web Apps**: `swa-{project}-{environment}`
- **Function Apps**: `func-{project}-{environment}`
- **Storage Accounts**: `st{project}{environment}`

## Configuration Patterns

### Environment Management
- **Local Development**: `local.settings.json` for Functions, environment variables for SWA
- **Production**: Azure App Settings and configuration
- **Type Safety**: Environment variable interfaces and validation

### Security Patterns
- **Managed Identity**: Preferred authentication method for Azure services
- **DefaultAzureCredential**: Azure SDK authentication with credential chain fallback
- **Key Vault Integration**: Secure storage of secrets and connection strings
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **API Security**: Function-level authentication and authorization

### Error Handling Patterns
- **Global Error Context**: React Context for centralized error state management
- **Error Modal Component**: User-friendly error display with specific error types
- **Service-level Retry**: Intelligent retry logic with exponential backoff
- **Logging Strategy**: Comprehensive console logging for debugging and monitoring

Last Updated: June 12, 2025
