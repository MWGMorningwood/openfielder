# Azure DevOps Deployment Configuration

This document outlines the Azure resources and configuration required for deploying OpenFielder using Azure DevOps CI/CD.

## Required Azure Resources

### 1. Azure Active Directory App Registration
Create an App Registration in Entra ID (Azure AD) for authentication:

**Required settings:**
- Name: `openfielder-app`
- Supported account types: `Accounts in this organizational directory only`
- Redirect URIs: 
  - `https://<your-static-web-app>.azurestaticapps.net/.auth/login/aad/callback`
- API permissions:
  - `https://atlas.microsoft.com/user_impersonation` (Azure Maps)
  - `openid`, `profile`, `email` (Microsoft Graph)

**Collect these values for later:**
- Application (client) ID
- Directory (tenant) ID
- Client Secret (generate one)

### 2. Azure Storage Account
For Azure Table Storage:
- SKU: Standard_LRS
- Tables: `openfielder`
- Access tier: Hot

### 3. Azure Maps Account
- SKU: G2 (Gen2)
- Authentication: Entra ID only (disable shared key)
- Pricing tier: Standard

### 4. Azure Static Web Apps
- SKU: Free or Standard
- Source: GitHub/Azure DevOps
- Build preset: React

### 5. Azure Functions
- Runtime: Node.js 20
- Plan: Consumption (Y1)
- Storage: Use same storage account as above

## Application Settings Configuration

### Static Web App Settings (Configure in Azure Portal)
```
AZURE_CLIENT_ID=<app-registration-client-id>
AZURE_CLIENT_SECRET=<app-registration-client-secret>
```

### Function App Settings (Configure in Azure Portal)
```
AZURE_CLIENT_ID=<managed-identity-client-id>
AZURE_STORAGE_ACCOUNT_NAME=<storage-account-name>
AZURE_TABLE_NAME=openfielder
AZURE_MAPS_ACCOUNT_NAME=<maps-account-name>
AZURE_TENANT_ID=<tenant-id>
```

## Required Role Assignments

### 1. Static Web App Managed Identity → Azure Maps
- Role: `Azure Maps Data Reader`
- Scope: Azure Maps Account

### 2. Function App Managed Identity → Storage Account
- Role: `Storage Table Data Contributor`
- Scope: Storage Account

### 3. Function App Managed Identity → Azure Maps
- Role: `Azure Maps Data Reader`
- Scope: Azure Maps Account

### 4. App Registration → Azure Maps
- Role: `Azure Maps Data Reader`
- Scope: Azure Maps Account

## Azure DevOps Pipeline Variables

Configure these as pipeline variables (mark secrets as secret):

```yaml
variables:
  # Resource names (can be generated or predefined)
  resourceGroupName: 'rg-openfielder-prod'
  storageAccountName: 'stopenfielder001'
  mapsAccountName: 'map-openfielder-001'
  staticWebAppName: 'swa-openfielder-001'
  functionAppName: 'func-openfielder-001'
  
  # Secrets (mark as secret variables)
  azureClientSecret: '<app-registration-client-secret>'
  
  # IDs (can be outputs from resource deployment)
  azureClientId: '<app-registration-client-id>'
  azureTenantId: '<tenant-id>'
```

## Deployment Order

1. **Azure Resources**: Deploy Azure resources first (Storage, Maps, Functions, Static Web App)
2. **Role Assignments**: Configure all required role assignments
3. **App Settings**: Configure application settings for each service
4. **Function Deployment**: Deploy the Azure Functions code
5. **Static Web App Deployment**: Deploy the React frontend

## Local Development Setup

For local development, ensure these tools are installed:
- Node.js 20+
- Azure Functions Core Tools v4
- Azure Storage Emulator (Azurite)

Local configuration is handled by:
- `api/local.settings.json` (Functions)
- `public/staticwebapp.config.json` (Static Web App config)

## Authentication Flow

1. User accesses Static Web App
2. SWA redirects to Entra ID for authentication
3. User logs in with organizational account
4. SWA receives token with Azure Maps scope
5. Frontend can directly call Azure Maps APIs using SWA auth
6. Backend Functions use managed identity for Azure services

## Security Notes

- No API keys are used - all authentication is via Entra ID
- Managed identities are used wherever possible
- All secrets are stored in Azure Key Vault or App Settings
- CORS is properly configured for production domains only
- All HTTP traffic is forced to HTTPS
