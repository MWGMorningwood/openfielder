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
import './functions/getMapsToken';
import './functions/geocode';