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
  latitude: number; // Internal use only - not exposed in UI
  longitude: number; // Internal use only - not exposed in UI
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
  latitude: number; // Internal use only - not exposed in UI
  longitude: number; // Internal use only - not exposed in UI
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
