// Shared types for OpenFielder application

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface Therapist {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: Address;
  isPaired: boolean;
  clientId?: string;
  availability: string;
  notes?: string;
  specializations?: string[];
  dateCreated: Date;
  dateModified: Date;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: Address;
  therapistId?: string;
  needsAssessment?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'paired' | 'inactive';
  dateCreated: Date;
  dateModified: Date;
}

export interface DistanceCalculation {
  therapistId: string;
  clientId: string;
  distance: number;
  therapistName: string;
  clientName: string;
}

/**
 * Enhanced distance calculation that includes both straight-line and route distances
 */
export interface EnhancedDistanceCalculation extends DistanceCalculation {
  /** Straight-line distance in kilometers */
  straightLineDistance: number;
  /** Route distance in kilometers (driving) */
  routeDistance?: number;
  /** Travel time in minutes */
  travelTimeMinutes?: number;
  /** Whether route calculation was successful */
  routeCalculationSuccess: boolean;
}

// Extended interfaces for when coordinates are needed
export interface TherapistWithCoordinates extends Therapist {
  latitude: number;
  longitude: number;
}

export interface ClientWithCoordinates extends Client {
  latitude: number;
  longitude: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Route calculation result from Azure Maps Route Directions API
 */
export interface RouteResult {
  /** Distance in kilometers */
  distanceKm: number;
  /** Travel time in minutes */
  travelTimeMinutes: number;
  /** Traffic delay in seconds */
  trafficDelaySeconds: number;
  /** Departure time (ISO string) */
  departureTime?: string;
  /** Arrival time (ISO string) */
  arrivalTime?: string;
}

export interface CreateTherapistRequest {
  name: string;
  email?: string;
  phone?: string;
  address: Address;
  availability: string;
  notes?: string;
  specializations?: string[];
}

export interface CreateClientRequest {
  name: string;
  email?: string;
  phone?: string;
  address: Address;
  needsAssessment?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: string;
}

// Export error-related types
export * from './types/errorTypes';
