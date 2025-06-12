# Decision Log

## Technical Decisions & Rationale

### Architecture Decisions

#### Static Web Apps vs App Service (June 11, 2025)
**Decision**: Use Azure Static Web Apps  
**Rationale**: 
- Built-in authentication with Entra ID integration
- Automatic HTTPS and global CDN
- Seamless integration with Azure Functions
- Cost-effective for frontend + API architecture
- Simplified deployment and CI/CD

**Alternatives Considered**:
- Azure App Service: More complex, higher cost, over-engineered for use case
- Container Apps: Unnecessary complexity for static frontend
- Virtual Machines: Manual management overhead

#### Authentication Strategy (June 11, 2025)
**Decision**: SWA Built-in Authentication with Entra ID  
**Rationale**:
- Zero-config Entra ID integration
- Automatic token management and refresh
- Built-in role-based access control
- No custom auth implementation required
- Leverages Azure security best practices

**Alternatives Considered**:
- MSAL.js: More complex implementation, manual token management
- Auth0: Third-party dependency, additional cost
- Custom JWT: Security risk, maintenance overhead

#### Frontend Framework (June 11, 2025)
**Decision**: React + TypeScript + Vite  
**Rationale**:
- Strong TypeScript support for type safety
- Vite provides fast development experience
- Large ecosystem and community support
- Team expertise and familiarity
- Excellent SWA integration

**Alternatives Considered**:
- Vue.js: Smaller ecosystem, less team experience
- Angular: Over-engineered for project scope
- Svelte: Limited enterprise adoption

#### Backend Architecture (June 11, 2025)
**Decision**: Azure Functions (TypeScript)  
**Rationale**:
- Serverless cost model aligns with usage patterns
- Native SWA integration
- TypeScript consistency across stack
- Automatic scaling based on demand
- Built-in monitoring and diagnostics

**Alternatives Considered**:
- Express.js on App Service: Higher fixed costs
- Container Apps: Unnecessary complexity
- .NET Functions: Team prefers TypeScript

### Data Storage Decisions

#### Primary Data Store (June 11, 2025)
**Decision**: Azure Table Storage  
**Rationale**:
- NoSQL flexibility for evolving schema
- Cost-effective for structured data
- Excellent performance for key-value queries
- Built-in replication and durability
- Simple integration with Functions

**Alternatives Considered**:
- Cosmos DB: Over-engineered, higher cost for current scale
- SQL Database: Less flexible schema, higher complexity
- Blob Storage: Not optimized for structured queries

#### Geocoding Service (June 11, 2025)
**Decision**: External geocoding API with caching  
**Rationale**:
- Specialized service provides better accuracy
- Caching reduces API calls and costs
- Separation of concerns
- Easy to switch providers if needed

**Alternatives Considered**:
- Azure Maps: More expensive for current usage
- Local geocoding: Maintenance overhead, accuracy concerns

### Development & Deployment

#### Build Tool (June 11, 2025)
**Decision**: Vite  
**Rationale**:
- Fastest build times for development
- Native TypeScript support
- Excellent HMR performance
- Simple configuration
- Growing industry adoption

**Alternatives Considered**:
- Webpack: Slower build times, complex configuration
- Rollup: Limited development features
- Parcel: Less configuration control

#### Deployment Strategy (June 11, 2025)
**Decision**: Azure DevOps with SWA CLI  
**Rationale**:
- Integrated with Azure ecosystem
- Built-in authentication for deployments
- Support for multiple environments
- Automated testing integration

**Alternatives Considered**:
- GitHub Actions: Team preference for Azure DevOps
- Manual deployment: No CI/CD automation

## Security Decisions

#### Secrets Management (June 11, 2025)
**Decision**: Azure Key Vault + Managed Identity  
**Rationale**:
- Centralized secret management
- Automatic credential rotation
- Audit logging for secret access
- Zero-configuration authentication

**Alternatives Considered**:
- Environment variables: Less secure, harder to rotate
- Configuration files: Security risk if committed

## Performance Decisions

#### Caching Strategy (June 11, 2025)
**Decision**: Browser caching + Service-level caching  
**Rationale**:
- Reduces API calls and improves UX
- Service-level caching for expensive operations
- Browser caching for static resources

**Alternatives Considered**:
- Redis Cache: Added complexity for current scale
- No caching: Poor performance and higher costs

#### Geocoding API Update (June 12, 2025)
**Decision**: Migrate to Azure Maps Geocoding API 2025-01-01  
**Rationale**:
- Old Search API (v1.0) was deprecated and causing 500 errors
- New Geocoding API provides better accuracy and performance
- GeoJSON response format aligns with modern standards
- Enhanced error handling and retry logic with exponential backoff
- Proper Azure authentication integration with DefaultAzureCredential

**Technical Implementation**:
- Updated backend to use `https://atlas.microsoft.com/geocode?api-version=2025-01-01`
- Added intelligent retry logic for transient failures
- Enhanced error handling with specific error codes and messages
- Improved logging for debugging authentication and API issues
- Proper GeoJSON parsing with longitude/latitude coordinate extraction

**Alternatives Considered**:
- Continue with deprecated Search API: Risk of service interruption
- Third-party geocoding service: Additional cost and integration complexity
- Client-side only geocoding: Security and rate limiting concerns

#### Map Component Timing Resolution (June 12, 2025)
**Decision**: Promise-based map readiness with delay buffer  
**Rationale**:
- Azure Maps requires sources be added only after map is fully initialized
- React useEffect timing conflicts with Azure Maps ready event
- Added 1-second delay buffer after map ready promise resolves
- Prevents "map is not ready" errors when adding data sources

**Technical Implementation**:
- Created `mapReadyPromiseRef` for proper async coordination
- Added source/layer validation before attempting to add to map
- Implemented robust error handling with try-catch blocks
- Enhanced logging for debugging map initialization issues

**Alternatives Considered**:
- Immediate source addition: Causes timing errors
- Multiple retry attempts: Adds complexity without addressing root cause
- Event-driven approach only: Insufficient for React lifecycle coordination

#### Error Handling Enhancement (June 12, 2025)
**Decision**: Comprehensive error boundaries with specific error types  
**Rationale**:
- Frontend needs graceful degradation for service failures
- Users require clear feedback for different error scenarios
- Debugging requires detailed error context and logging

**Technical Implementation**:
- Added ErrorContext for global error state management
- Created ErrorModal component for user-friendly error display
- Implemented specific error types (geocoding, authentication, rate limiting)
- Enhanced API error responses with appropriate HTTP status codes

## Future Decisions Needed
- [ ] Database migration strategy for scale
- [ ] Monitoring and alerting configuration
- [ ] Backup and disaster recovery approach
- [ ] Multi-region deployment strategy

Last Updated: June 12, 2025
