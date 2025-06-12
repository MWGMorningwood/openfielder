import { 
  Therapist, 
  Client, 
  TherapistTableEntity, 
  ClientTableEntity,
  CreateTherapistRequest,
  CreateClientRequest,
  UpdateTherapistRequest,
  UpdateClientRequest
} from '../types';
import { TableStorageService } from './tableStorage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Business logic service for managing therapists and clients
 * No longer handles coordinates - they are geocoded on-demand in frontend
 */
export class OpenFielderService {
  private tableService: TableStorageService;

  constructor() {
    this.tableService = TableStorageService.getInstance();
  }

  /**
   * Initialize the service and underlying storage
   */
  public async initialize(): Promise<void> {
    await this.tableService.initializeTable();
  }

  /**
   * Create a new therapist
   */
  public async createTherapist(request: CreateTherapistRequest): Promise<Therapist> {
    const id = uuidv4();
    const now = new Date();
    
    const therapist: Therapist = {
      id,
      name: request.name,
      email: request.email,
      phone: request.phone,
      address: request.address,
      isPaired: false,
      availability: request.availability,
      notes: request.notes,
      specializations: request.specializations || [],
      dateCreated: now,
      dateModified: now
    };

    const tableEntity: TherapistTableEntity = {
      partitionKey: 'THERAPIST',
      rowKey: id,
      name: therapist.name,
      email: therapist.email,
      phone: therapist.phone,
      address: JSON.stringify(therapist.address),
      isPaired: therapist.isPaired,
      clientId: therapist.clientId,
      availability: therapist.availability,
      notes: therapist.notes,
      specializations: JSON.stringify(therapist.specializations),
      dateCreated: therapist.dateCreated,
      dateModified: therapist.dateModified
    };

    await this.tableService.upsertEntity(tableEntity);
    return therapist;
  }

  /**
   * Create a new client
   */
  public async createClient(request: CreateClientRequest): Promise<Client> {
    const id = uuidv4();
    const now = new Date();
    
    const client: Client = {
      id,
      name: request.name,
      email: request.email,
      phone: request.phone,
      address: request.address,
      needsAssessment: request.needsAssessment,
      priority: request.priority,
      status: 'active',
      dateCreated: now,
      dateModified: now
    };

    const tableEntity: ClientTableEntity = {
      partitionKey: 'CLIENT',
      rowKey: id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: JSON.stringify(client.address),
      therapistId: client.therapistId,
      needsAssessment: client.needsAssessment,
      priority: client.priority,
      status: client.status,
      dateCreated: client.dateCreated,
      dateModified: client.dateModified
    };

    await this.tableService.upsertEntity(tableEntity);
    return client;
  }

  /**
   * Get therapist by ID
   */
  public async getTherapistById(id: string): Promise<Therapist | null> {
    const entity = await this.tableService.getEntity<TherapistTableEntity>('THERAPIST', id);
    if (!entity) return null;

    return {
      id: entity.rowKey,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      address: JSON.parse(entity.address),
      isPaired: entity.isPaired,
      clientId: entity.clientId,
      availability: entity.availability,
      notes: entity.notes,
      specializations: entity.specializations ? JSON.parse(entity.specializations) : [],
      dateCreated: entity.dateCreated,
      dateModified: entity.dateModified
    };
  }

  /**
   * Get client by ID
   */
  public async getClientById(id: string): Promise<Client | null> {
    const entity = await this.tableService.getEntity<ClientTableEntity>('CLIENT', id);
    if (!entity) return null;

    return {
      id: entity.rowKey,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      address: JSON.parse(entity.address),
      therapistId: entity.therapistId,
      needsAssessment: entity.needsAssessment,
      priority: entity.priority as 'low' | 'medium' | 'high',
      status: entity.status as 'active' | 'paired' | 'inactive',
      dateCreated: entity.dateCreated,
      dateModified: entity.dateModified
    };
  }

  /**
   * Get all therapists
   */
  public async getAllTherapists(): Promise<Therapist[]> {
    const entities = await this.tableService.listEntitiesByPartition<TherapistTableEntity>('THERAPIST');
    return entities.map(entity => ({
      id: entity.rowKey,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      address: JSON.parse(entity.address),
      isPaired: entity.isPaired,
      clientId: entity.clientId,
      availability: entity.availability,
      notes: entity.notes,
      specializations: entity.specializations ? JSON.parse(entity.specializations) : [],
      dateCreated: entity.dateCreated,
      dateModified: entity.dateModified
    }));
  }

  /**
   * Get all clients
   */
  public async getAllClients(): Promise<Client[]> {
    const entities = await this.tableService.listEntitiesByPartition<ClientTableEntity>('CLIENT');
    return entities.map(entity => ({
      id: entity.rowKey,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      address: JSON.parse(entity.address),
      therapistId: entity.therapistId,
      needsAssessment: entity.needsAssessment,
      priority: entity.priority as 'low' | 'medium' | 'high',
      status: entity.status as 'active' | 'paired' | 'inactive',
      dateCreated: entity.dateCreated,
      dateModified: entity.dateModified
    }));
  }

  /**
   * Update therapist
   */
  public async updateTherapist(request: UpdateTherapistRequest): Promise<Therapist> {
    const existing = await this.getTherapistById(request.id);
    if (!existing) throw new Error('Therapist not found');

    const updated: Therapist = {
      ...existing,
      ...request,
      dateModified: new Date()
    };

    const tableEntity: TherapistTableEntity = {
      partitionKey: 'THERAPIST',
      rowKey: request.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: JSON.stringify(updated.address),
      isPaired: updated.isPaired,
      clientId: updated.clientId,
      availability: updated.availability,
      notes: updated.notes,
      specializations: JSON.stringify(updated.specializations),
      dateCreated: updated.dateCreated,
      dateModified: updated.dateModified
    };

    await this.tableService.upsertEntity(tableEntity);
    return updated;
  }

  /**
   * Update client
   */
  public async updateClient(request: UpdateClientRequest): Promise<Client> {
    const existing = await this.getClientById(request.id);
    if (!existing) throw new Error('Client not found');

    const updated: Client = {
      ...existing,
      ...request,
      dateModified: new Date()
    };

    const tableEntity: ClientTableEntity = {
      partitionKey: 'CLIENT',
      rowKey: request.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      address: JSON.stringify(updated.address),
      therapistId: updated.therapistId,
      needsAssessment: updated.needsAssessment,
      priority: updated.priority,
      status: updated.status,
      dateCreated: updated.dateCreated,
      dateModified: updated.dateModified
    };

    await this.tableService.upsertEntity(tableEntity);
    return updated;
  }

  /**
   * Delete therapist
   */
  public async deleteTherapist(id: string): Promise<void> {
    await this.tableService.deleteEntity('THERAPIST', id);
  }

  /**
   * Delete client
   */
  public async deleteClient(id: string): Promise<void> {
    // First unpair if client is paired
    const client = await this.getClientById(id);
    if (client?.therapistId) {
      await this.unpairTherapist(client.therapistId);
    }
    await this.tableService.deleteEntity('CLIENT', id);
  }

  /**
   * Pair therapist with client
   */
  public async pairTherapistWithClient(therapistId: string, clientId: string): Promise<void> {
    const therapist = await this.getTherapistById(therapistId);
    const client = await this.getClientById(clientId);

    if (!therapist) throw new Error('Therapist not found');
    if (!client) throw new Error('Client not found');

    if (therapist.isPaired) throw new Error('Therapist is already paired');
    if (client.status === 'paired') throw new Error('Client is already paired');

    // Update therapist
    await this.updateTherapist({
      id: therapistId,
      isPaired: true,
      clientId: clientId
    });

    // Update client
    await this.updateClient({
      id: clientId,
      therapistId: therapistId,
      status: 'paired'
    });
  }

  /**
   * Unpair therapist (removes client association)
   */
  public async unpairTherapist(therapistId: string): Promise<void> {
    const therapist = await this.getTherapistById(therapistId);
    if (!therapist) throw new Error('Therapist not found');

    if (therapist.clientId) {
      // Update client status
      await this.updateClient({
        id: therapist.clientId,
        therapistId: undefined,
        status: 'active'
      });
    }

    // Update therapist
    await this.updateTherapist({
      id: therapistId,
      isPaired: false,
      clientId: undefined
    });
  }
}
