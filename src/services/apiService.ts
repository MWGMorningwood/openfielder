import type { Therapist, Client, CreateTherapistRequest, CreateClientRequest, DistanceCalculation } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7071/api';

/**
 * API service for communicating with Azure Functions backend
 */
export class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Therapist operations
  async getTherapists(): Promise<Therapist[]> {
    const response = await this.request<{ therapists: Therapist[] }>('/therapists');
    return response.therapists.map(therapist => ({
      ...therapist,
      dateCreated: new Date(therapist.dateCreated),
      dateModified: new Date(therapist.dateModified),
    }));
  }

  async createTherapist(therapist: CreateTherapistRequest): Promise<Therapist> {
    const response = await this.request<{ therapist: Therapist }>('/therapists', {
      method: 'POST',
      body: JSON.stringify(therapist),
    });
    return {
      ...response.therapist,
      dateCreated: new Date(response.therapist.dateCreated),
      dateModified: new Date(response.therapist.dateModified),
    };
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    const response = await this.request<{ clients: Client[] }>('/clients');
    return response.clients.map(client => ({
      ...client,
      dateCreated: new Date(client.dateCreated),
      dateModified: new Date(client.dateModified),
    }));
  }

  async createClient(client: CreateClientRequest): Promise<Client> {
    const response = await this.request<{ client: Client }>('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
    return {
      ...response.client,
      dateCreated: new Date(response.client.dateCreated),
      dateModified: new Date(response.client.dateModified),
    };
  }

  // Pairing operations
  async findNearestTherapists(clientId: string, limit: number = 10): Promise<DistanceCalculation[]> {
    const response = await this.request<{ nearestTherapists: DistanceCalculation[] }>(
      `/pairing/nearest/${clientId}?limit=${limit}`
    );
    return response.nearestTherapists;
  }

  async pairTherapistWithClient(therapistId: string, clientId: string): Promise<void> {
    await this.request('/pairing/pair', {
      method: 'POST',
      body: JSON.stringify({ therapistId, clientId }),
    });
  }

  async unpairTherapist(therapistId: string): Promise<void> {
    await this.request('/pairing/unpair', {
      method: 'POST',
      body: JSON.stringify({ therapistId }),
    });
  }
}

export const apiService = new ApiService();
