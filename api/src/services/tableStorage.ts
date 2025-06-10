import { TableClient, TableServiceClient, TransactionAction } from '@azure/data-tables';
import { DefaultAzureCredential } from '@azure/identity';

/**
 * Service for managing Azure Table Storage operations
 * Uses managed identity for authentication in production and connection strings for local development
 */
export class TableStorageService {
  private tableClient: TableClient;
  private static instance: TableStorageService;

  private constructor() {
    const tableName = process.env.AZURE_TABLE_NAME || 'openfielder';
    const isLocal = process.env.NODE_ENV === 'development';
      if (isLocal) {
      // Use connection string for local development with Azurite
      const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
      if (!connectionString) {
        throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required for local development');
      }
      
      this.tableClient = TableClient.fromConnectionString(connectionString, tableName, {
        allowInsecureConnection: true // Allow HTTP connections for local Azurite
      });
    } else {
      // Use managed identity authentication for production - no keys required
      const storageAccountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
      if (!storageAccountName) {
        throw new Error('AZURE_STORAGE_ACCOUNT_NAME environment variable is required');
      }

      const credential = new DefaultAzureCredential();
      this.tableClient = new TableClient(
        `https://${storageAccountName}.table.core.windows.net`,
        tableName,
        credential
      );
    }
  }

  /**
   * Get singleton instance of TableStorageService
   */
  public static getInstance(): TableStorageService {
    if (!TableStorageService.instance) {
      TableStorageService.instance = new TableStorageService();
    }
    return TableStorageService.instance;
  }

  /**
   * Initialize table if it doesn't exist
   */  public async initializeTable(): Promise<void> {
    try {
      await this.tableClient.createTable();
    } catch (error: unknown) {
      // Table already exists - this is expected
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode !== 409) {
        console.error('Error creating table:', error);
        throw error;
      }
    }
  }/**
   * Create or update an entity in the table
   */
  public async upsertEntity(entity: { partitionKey: string; rowKey: string; [key: string]: unknown }): Promise<void> {
    try {
      await this.tableClient.upsertEntity(entity, 'Merge');
    } catch (error: unknown) {
      console.error('Error upserting entity:', error);
      throw new Error(`Failed to upsert entity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get an entity by partition key and row key
   */
  public async getEntity<T extends object>(partitionKey: string, rowKey: string): Promise<T | null> {
    try {
      const entity = await this.tableClient.getEntity<T>(partitionKey, rowKey);
      return entity;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        return null;
      }
      console.error('Error getting entity:', error);
      throw new Error(`Failed to get entity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  /**
   * List entities by partition key with optional filtering
   */
  public async listEntitiesByPartition<T extends object>(
    partitionKey: string, 
    filter?: string
  ): Promise<T[]> {
    try {
      const entities: T[] = [];
      let queryFilter = `PartitionKey eq '${partitionKey}'`;
      
      if (filter) {
        queryFilter += ` and ${filter}`;
      }

      const entitiesIter = this.tableClient.listEntities<T>({
        queryOptions: { filter: queryFilter }
      });

      for await (const entity of entitiesIter) {
        entities.push(entity);
      }

      return entities;    } catch (error) {
      console.error('Error listing entities:', error);
      throw new Error(`Failed to list entities: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete an entity by partition key and row key
   */
  public async deleteEntity(partitionKey: string, rowKey: string): Promise<void> {
    try {
      await this.tableClient.deleteEntity(partitionKey, rowKey);    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 404) {
        return; // Entity already deleted
      }
      console.error('Error deleting entity:', error);
      throw new Error(`Failed to delete entity: ${error instanceof Error ? error.message : String(error)}`);
    }
  }  /**
   * Batch operation for multiple entities
   */
  public async submitTransaction(operations: TransactionAction[]): Promise<void> {
    try {
      await this.tableClient.submitTransaction(operations);
    } catch (error) {
      console.error('Error submitting transaction:', error);
      throw new Error(`Failed to submit transaction: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
