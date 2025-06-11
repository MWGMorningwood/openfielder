# Product Context

## Business Overview
**Project**: OpenFielder  
**Domain**: Healthcare/Therapy Service Matching  
**Platform**: Azure Static Web Apps + Functions

## Core Business Logic

### User Management
- **Clients**: Individuals seeking therapy services
- **Therapists**: Healthcare providers offering services
- **Pairing System**: Algorithm to match clients with appropriate therapists

### Authentication Requirements
- **Entra ID Integration**: Full Azure AD authentication
- **Role-based Access**: Different permissions for clients vs therapists
- **Secure Sessions**: SWA built-in authentication with client principal

### Geographic Features
- **Location Services**: Geocoding for address resolution
- **Map Integration**: Visual representation of locations
- **Distance Calculations**: Proximity-based matching algorithms

## User Requirements

### Client Features
- **Registration**: Secure account creation with Entra ID
- **Profile Management**: Personal information and preferences
- **Therapist Search**: Find nearby and compatible therapists
- **Appointment Booking**: Schedule sessions with matched therapists

### Therapist Features  
- **Professional Registration**: Verified healthcare provider accounts
- **Availability Management**: Set working hours and availability
- **Client Matching**: Receive client referrals and requests
- **Profile Visibility**: Searchable professional profiles

### System Features
- **Intelligent Matching**: Algorithm-based client-therapist pairing
- **Real-time Updates**: Live availability and booking status
- **Secure Communication**: HIPAA-compliant messaging (future)
- **Analytics Dashboard**: Usage metrics and matching effectiveness

## Feature Specifications

### Authentication Flow
1. User accesses application
2. Redirected to Entra ID login if not authenticated
3. Post-authentication role assignment (client/therapist)
4. Role-based UI and feature access

### Data Management
- **Azure Table Storage**: Entity storage for clients, therapists, pairings
- **Geocoding Integration**: Address to coordinate conversion
- **Data Validation**: Input sanitization and type checking

### API Endpoints
- `GET/POST /api/clients` - Client management
- `GET/POST /api/therapists` - Therapist management  
- `GET/POST /api/pairing` - Matching service
- Authentication required for all endpoints

## Security & Compliance

### Data Protection
- **Encryption**: Data at rest and in transit
- **Access Control**: Role-based permissions
- **Audit Logging**: User action tracking
- **Data Retention**: Compliance with healthcare regulations

### Privacy Requirements
- **HIPAA Considerations**: Future healthcare data compliance
- **User Consent**: Clear data usage agreements
- **Data Minimization**: Collect only necessary information
- **Right to Deletion**: User account and data removal

## Performance Targets
- **Page Load**: < 2 seconds initial load
- **API Response**: < 500ms for standard operations
- **Search Results**: < 1 second for therapist matching
- **Uptime**: 99.9% availability target

Last Updated: June 11, 2025
