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

// Insert function-wide code here. Individual functions are defined in separate files and executed automatically from .\src\functions\{functionName}.ts