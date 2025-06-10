// Data models for OpenFielder application

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
  latitude: number;
  longitude: number;
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
  latitude: number;
  longitude: number;
  address: Address;
  therapistId?: string;
  needsAssessment?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'paired' | 'inactive';
  dateCreated: Date;
  dateModified: Date;
}

export interface TherapistTableEntity {
  [key: string]: unknown;
  partitionKey: string; // 'THERAPIST'
  rowKey: string; // therapist ID
  name: string;
  email?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  address: string; // JSON string of Address object
  isPaired: boolean;
  clientId?: string;
  availability: string;
  notes?: string;
  specializations?: string; // JSON string
  dateCreated: Date;
  dateModified: Date;
}

export interface ClientTableEntity {
  [key: string]: unknown;
  partitionKey: string; // 'CLIENT'
  rowKey: string; // client ID
  name: string;
  email?: string;
  phone?: string;
  latitude: number;
  longitude: number;
  address: string; // JSON string of Address object
  therapistId?: string;
  needsAssessment?: string;
  priority: string;
  status: string;
  dateCreated: Date;
  dateModified: Date;
}

export interface DistanceCalculation {
  therapistId: string;
  clientId: string;
  distance: number; // in kilometers
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

export interface UpdateTherapistRequest extends Partial<CreateTherapistRequest> {
  id: string;
  isPaired?: boolean;
  clientId?: string;
}

export interface UpdateClientRequest extends Partial<CreateClientRequest> {
  id: string;
  therapistId?: string;
  status?: 'active' | 'paired' | 'inactive';
}
