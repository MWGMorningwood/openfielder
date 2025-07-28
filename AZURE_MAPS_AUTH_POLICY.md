# Azure Maps Authentication Policy

## SECURITY REQUIREMENT: MANAGED IDENTITY ONLY

**SUBSCRIPTION KEYS ARE EXPLICITLY FORBIDDEN**

All Azure Maps authentication in this project MUST use Azure Managed Identity with RBAC (Role-Based Access Control). This policy applies to:

- All Azure Functions that call Azure Maps APIs
- All client-side code that accesses Azure Maps services
- All development, staging, and production environments

## Why Subscription Keys Are Forbidden

1. **Security Risk**: Subscription keys provide broad access to all Azure Maps services
2. **No Granular Control**: Cannot limit permissions to specific operations
3. **Key Management**: Risk of key exposure in code, logs, or configuration files
4. **Compliance**: Enterprise security requirements mandate RBAC over shared keys

## Required Approach: Managed Identity + RBAC

### For Azure Functions:
```typescript
// ✅ CORRECT: Use managed identity
const credential = new DefaultAzureCredential();
const tokenResponse = await credential.getToken('https://atlas.microsoft.com/.default');

// ❌ FORBIDDEN: Never use subscription keys
const subscriptionKey = process.env.AZURE_MAPS_SUBSCRIPTION_KEY; // NO!
```

### Required Azure RBAC Roles:
- `Azure Maps Data Reader` - For geocoding and map data access
- `Azure Maps Search and Render Data Reader` - For search operations

## Local Development

Even in local development, managed identity should be used via:
- Azure CLI login (`az login`)
- Visual Studio/VS Code Azure extension authentication
- Service principal with appropriate RBAC roles

## Exception Policy

**NO EXCEPTIONS**: Under no circumstances should subscription keys be used, even temporarily or for debugging purposes.

If managed identity is not working:
1. Check RBAC role assignments on the Azure Maps account
2. Verify the managed identity is properly configured
3. Ensure the correct Azure Maps account name is specified
4. Review Azure Functions app identity settings

## Enforcement

This policy is enforced through:
- Code reviews that reject any subscription key usage
- Static analysis tools that flag subscription key patterns
- Runtime checks that prevent fallback to subscription keys
- Documentation that explicitly forbids this approach

Last Updated: June 13, 2025
