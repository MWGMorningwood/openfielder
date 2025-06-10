/**
 * OpenFielder API - Azure Functions Entry Point
 * 
 * This application provides a serverless API for managing therapist-client mappings
 * using Azure Table Storage and Azure Functions.
 * 
 * Endpoints:
 * - GET/POST /api/therapists - Manage therapists
 * - GET/POST /api/clients - Manage clients  
 * - GET /api/pairing/nearest/{clientId} - Find nearest therapists
 * - POST /api/pairing/pair - Pair therapist with client
 * - POST /api/pairing/unpair - Unpair therapist
 */

// Import all function definitions to register them
import './functions/therapists';
import './functions/clients';
import './functions/pairing';

console.log('OpenFielder API - Azure Functions initialized');
console.log('Available endpoints:');
console.log('  - GET/POST /api/therapists');
console.log('  - GET/POST /api/clients');
console.log('  - GET /api/pairing/nearest/{clientId}');
console.log('  - POST /api/pairing/pair');
console.log('  - POST /api/pairing/unpair');
