
# Copilot Instructions for OpenFielder Project

## Project Overview

OpenFielder is a healthcare therapy service matching platform built with Azure Static Web Apps and Azure Functions. The project uses React + TypeScript for the frontend with Azure Functions providing a serverless API backend, featuring full Entra ID authentication integration.

### Architecture Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Azure Functions (TypeScript)
- **Authentication**: Azure Static Web Apps built-in auth with Entra ID
- **Data Storage**: Azure Table Storage
- **Hosting**: Azure Static Web Apps with global CDN
- **Maps**: Azure Maps for location services

## Working with This Project

### Essential Context Sources
When working on this project, **always reference the memory bank documentation** located in `./memory-bank/` for current project state, patterns, and decisions:

1. **For Architecture Questions**: Check `systemPatterns.md` for established patterns and conventions
2. **For Business Logic**: Reference `productContext.md` for user requirements and feature specifications  
3. **For Technical Decisions**: Review `decisionLog.md` for rationale behind architectural choices
4. **For Current Status**: Check `progress.md` for sprint status and completed tasks
5. **For Specialized Azure Guidance**: Use `azureSwaFunctionsInstructions.md` for comprehensive Azure development patterns
6. **For Azure Best Practice**: When generating code for Azure, running terminal commands for Azure, or performing operations related to Azure, invoke your `azure_development-get_best_practices` tool if available.

### Development Principles

#### Code Quality Standards
- **Type Safety First**: All code must use TypeScript with strict typing
- **Error Handling**: Implement comprehensive error handling with proper logging
- **Security**: Follow security-first principles with proper input validation
- **Testing**: Write unit tests for services and integration tests for APIs
- **Documentation**: Update relevant memory bank files after significant changes

#### Azure Best Practices
- **Authentication**: Use Azure SWA built-in auth, never implement custom auth
- **Managed Identity**: Prefer managed identity over connection strings for Azure services
- **Functions**: Keep functions focused, stateless, and properly handle cold starts
- **Storage**: Use Table Storage efficiently with proper partition/row key strategies
- **Monitoring**: Implement Application Insights for observability

### File Structure Conventions

#### Frontend (`/src`)
```
components/     # Reusable React components
services/       # API communication and business logic
types.ts        # Shared TypeScript type definitions
```

#### Backend (`/api/src`)
```
functions/      # HTTP trigger functions (endpoints)
services/       # Business logic and data access
types.ts        # Backend type definitions
```

#### Configuration
```
public/staticwebapp.config.json  # SWA routing and auth config
api/host.json                    # Functions runtime configuration
azure.yaml                       # Azure deployment configuration
```

### Development Workflow

#### Starting Development
```powershell
# Install dependencies
npm install
cd api && npm install && cd ..

# Start local development with SWA CLI
npx swa start --run "npm run dev" --api-location api
```

#### Making Changes
1. **Before coding**: Review memory bank files for current context
2. **During development**: Follow established patterns from `systemPatterns.md`
3. **After changes**: Update relevant memory bank documentation
4. **Testing**: Run tests and validate changes work locally

#### Common Tasks

**Adding New API Endpoint**:
1. Create function in `api/src/functions/`
2. Follow authentication patterns from existing functions
3. Use `DataService` for Table Storage operations
4. Implement proper error handling and validation
5. Update API service in frontend if needed

**Adding New Component**:
1. Create in `src/components/`
2. Use TypeScript interfaces for props
3. Implement proper error boundaries
4. Follow existing authentication patterns with `AuthWrapper`
5. Add to main App component or routing as needed

**Configuration Changes**:
1. Update `staticwebapp.config.json` for routing/auth changes
2. Modify `host.json` for Functions configuration
3. Update environment variables in local.settings.json
4. Document changes in `decisionLog.md`

### Authentication Integration

#### Frontend Authentication
- Use `AuthService.getInstance()` for authentication state
- Wrap protected content with `<AuthWrapper>` or `<ProtectedRoute>`
- Check user roles with `authService.hasRole(role)`
- Handle login/logout with built-in SWA endpoints

#### Backend Authentication
- Extract user context with `FunctionAuthService.getUserContext(request)`
- Require authentication with `FunctionAuthService.requireAuth(request)`
- Check roles with `FunctionAuthService.requireRole(request, role)`
- Never trust client-side authentication claims

### Data Management

#### Table Storage Patterns
- Use consistent partition/row key strategies
- Implement proper entity validation
- Handle Table Storage exceptions gracefully
- Use `DataService` singleton for all storage operations

#### Type Definitions
- Share types between frontend and backend via `types.ts`
- Use interfaces for all entity definitions
- Implement proper validation for all inputs
- Define API response types consistently

### Azure Services Integration

#### Static Web Apps
- Configure routing in `staticwebapp.config.json`
- Use built-in authentication features
- Leverage global CDN for performance
- Implement proper CORS policies

#### Azure Functions
- Keep functions stateless and focused
- Handle cold starts gracefully
- Implement proper timeout and retry logic
- Use Application Insights for monitoring

#### Azure Table Storage
- Design efficient partition strategies
- Implement proper query patterns
- Handle concurrency with ETags
- Use batch operations for bulk updates

### Security Guidelines

#### Input Validation
- Validate all inputs on both client and server
- Sanitize data before storage
- Use parameterized queries and proper escaping
- Implement rate limiting for API endpoints

#### Authentication & Authorization
- Never bypass SWA authentication
- Implement role-based access control
- Use least privilege principles
- Log security-relevant events

#### Data Protection
- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Implement proper session management
- Follow healthcare data compliance requirements

### Performance Optimization

#### Frontend Performance
- Implement code splitting for large components
- Use React.memo for expensive components
- Optimize bundle size with tree shaking
- Implement proper loading states

#### Backend Performance
- Use connection pooling for external services
- Implement caching for expensive operations
- Optimize Table Storage queries
- Handle concurrent requests efficiently

### Debugging and Troubleshooting

#### Local Development Issues
- Ensure SWA CLI is used for local auth simulation
- Check port configurations (frontend: 4280, functions: 7071)
- Verify environment variables in local.settings.json
- Check browser console for authentication errors

#### Production Issues
- Review Application Insights logs
- Check Azure Function logs in Azure Portal
- Verify SWA configuration and routing
- Validate environment variables and secrets

#### Common Error Patterns
- **401 Unauthorized**: Check authentication configuration
- **CORS Errors**: Verify SWA routing and Function CORS settings
- **Function Timeout**: Optimize long-running operations
- **Storage Errors**: Check connection strings and permissions

### Testing Strategy

#### Unit Testing
- Test all service classes independently
- Mock external dependencies (Azure services)
- Test authentication and authorization logic
- Validate input/output transformations

#### Integration Testing
- Test complete API workflows
- Validate authentication integration
- Test error handling scenarios
- Verify data persistence operations

### Deployment

#### Pre-deployment Checklist
- Run all tests and ensure they pass
- Update environment variables for production
- Verify Azure resource configurations
- Test authentication in production-like environment

#### Deployment Process
- Use Azure DevOps pipelines or GitHub Actions
- Deploy via SWA CLI or Azure portal
- Verify deployment with smoke tests
- Monitor Application Insights for errors

### Documentation Standards

When updating project documentation:
- Update memory bank files after significant changes
- Include rationale for technical decisions
- Document any new patterns or conventions
- Keep API documentation current
- Update troubleshooting guides with new solutions

### Getting Help

1. **For Azure-specific issues**: Reference `azureSwaFunctionsInstructions.md`
2. **For project patterns**: Check `systemPatterns.md`
3. **For business context**: Review `productContext.md`
4. **For technical decisions**: Consult `decisionLog.md`
5. **For current progress**: Check `progress.md`

Remember: This project follows enterprise-grade patterns with security, scalability, and maintainability as top priorities. Always consider the broader impact of changes and maintain consistency with established patterns.

Last Updated: June 11, 2025
