# OpenFielder

A healthcare therapy service matching platform built with Azure Static Web Apps and Azure Functions, featuring full Entra ID authentication integration and intelligent client-therapist pairing.

## Overview

OpenFielder connects clients seeking therapy services with qualified healthcare providers through an intelligent matching algorithm. The platform leverages Azure's cloud services to provide secure, scalable, and reliable healthcare service coordination.

### Key Features

- **Secure Authentication**: Full Entra ID integration with role-based access control
- **Intelligent Matching**: Algorithm-based client-therapist pairing system
- **Location Services**: Azure Maps integration for geocoding and proximity matching
- **Real-time Updates**: Live availability and booking status
- **Professional Profiles**: Searchable therapist profiles with specializations
- **Geographic Visualization**: Interactive maps showing client and therapist locations

## Architecture

### Frontend
- **React 19** + **TypeScript** + **Vite** for type-safe, fast development
- **Azure Maps** integration for interactive mapping
- **Component composition** with AuthWrapper for protected routes
- **Centralized error handling** with ErrorContext and ErrorModal

### Backend
- **Azure Functions** (TypeScript) for serverless API endpoints
- **Azure Table Storage** for NoSQL entity storage
- **Azure Maps Geocoding API** with DefaultAzureCredential authentication
- **Service layer pattern** with dependency injection

### Authentication & Security
- **Azure Static Web Apps** built-in authentication with Entra ID
- **Role-based access control** (clients vs therapists)
- **Managed Identity** for Azure service authentication
- **HIPAA-compliant** design for healthcare data protection

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Azure CLI authenticated with appropriate permissions
- Azure Maps account with client ID configured

### Local Development

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd openfielder
   npm install
   cd api && npm install && cd ..
   ```

2. **Configure environment variables**:
   ```bash
   # In api/local.settings.json
   {
     "Values": {
       "AZURE_MAPS_CLIENT_ID": "your-azure-maps-client-id"
     }
   }
   ```

3. **Start development servers**:
   ```bash
   # Start both frontend and backend with SWA CLI
   npx swa start --run "npm run dev" --api-location api
   ```

4. **Access the application**:
   - Frontend: http://localhost:4280
   - API: http://localhost:7071

### Building for Production

```bash
# Build frontend
npm run build

# Build backend
cd api && npm run build
```

## API Endpoints

All endpoints require authentication (`/.auth/login/aad` for Entra ID):

- `GET/POST /api/clients` - Client management and registration
- `GET/POST /api/therapists` - Therapist management and profiles
- `GET/POST /api/pairing` - Intelligent matching service
- `POST /api/geocode` - Address geocoding service
- `GET /api/getMapsToken` - Azure Maps access token retrieval

## Project Structure

```
openfielder/
├── api/                          # Azure Functions backend
│   ├── src/
│   │   ├── functions/           # HTTP trigger functions
│   │   ├── services/            # Business logic and data access
│   │   └── types.ts             # Shared type definitions
│   └── local.settings.json      # Local environment configuration
├── src/                         # React frontend
│   ├── components/              # Reusable React components
│   ├── services/                # API communication and auth
│   ├── contexts/                # React contexts (Error, etc.)
│   └── types.ts                 # Frontend type definitions
├── public/
│   └── staticwebapp.config.json # SWA routing and auth config
├── memory-bank/                 # Project documentation
│   ├── systemPatterns.md        # Architecture and code patterns
│   ├── productContext.md        # Business logic and requirements
│   ├── progress.md              # Sprint tracking and status
│   └── decisionLog.md           # Technical decisions and rationale
└── azure.yaml                  # Azure deployment configuration
```

## Development Patterns

### Authentication
```typescript
// Check authentication status
const authService = AuthService.getInstance();
const user = await authService.getUserInfo();

// Protect components
<AuthWrapper>
  <ProtectedComponent />
</AuthWrapper>
```

### API Communication
```typescript
// Make authenticated API calls
const apiService = ApiService.getInstance();
const therapists = await apiService.getTherapists();
```

### Geocoding
```typescript
// Geocode addresses with retry logic
const coordinates = await geocodingService.geocodeAddress({
  street1: "123 Main St",
  city: "Seattle",
  state: "WA",
  zipCode: "98101"
});
```

### Error Handling
```typescript
// Global error context
const { showError } = useError();
showError("Operation failed", "Please try again later");
```

## Deployment

### Azure Static Web Apps
The application deploys automatically to Azure Static Web Apps with:
- **Global CDN** for fast content delivery
- **Automatic HTTPS** with custom domain support
- **Built-in authentication** with Entra ID
- **Integrated Azure Functions** for API endpoints

### CI/CD Pipeline
- Automatic deployment on git push
- Environment-specific configurations
- Azure resource provisioning via `azure.yaml`

## Security & Compliance

- **Entra ID Authentication**: Enterprise-grade identity management
- **Role-based Access Control**: Separate permissions for clients and therapists
- **Data Encryption**: At rest and in transit
- **HIPAA Considerations**: Designed for healthcare data compliance
- **Audit Logging**: Comprehensive user action tracking

## Contributing

### Code Standards
- **TypeScript**: Strict mode enabled for type safety
- **ESLint**: Configured for React and TypeScript
- **Naming Conventions**: PascalCase for components, camelCase for functions
- **Service Pattern**: Singleton services for API and authentication

### Memory Bank System
Before making changes, consult the memory bank documentation:
- `systemPatterns.md` - Established patterns and conventions
- `productContext.md` - Business requirements and user needs
- `decisionLog.md` - Technical decisions and rationale
- `progress.md` - Current sprint status and priorities

## Performance Targets

- **Page Load**: < 2 seconds initial load
- **API Response**: < 500ms for standard operations
- **Search Results**: < 1 second for therapist matching
- **Uptime**: 99.9% availability target

## Support & Documentation

- **Architecture Decisions**: See `memory-bank/decisionLog.md`
- **Business Requirements**: See `memory-bank/productContext.md`
- **Development Patterns**: See `memory-bank/systemPatterns.md`
- **Current Progress**: See `memory-bank/progress.md`

## License

[License information to be added]

---

**Last Updated**: June 12, 2025  
**Version**: 1.0.0  
**Azure Architecture**: Static Web Apps + Functions + Table Storage + Azure Maps
