/**
 * Core types and interfaces for the storage plugin
 */

export type FieldType = 
  | 'string' 
  | 'number' 
  | 'integer' 
  | 'boolean' 
  | 'timestamp' 
  | 'uuid' 
  | 'json' 
  | 'enum'
  | 'array<string>'
  | 'array<number>';

export interface FieldDefinition {
  type: FieldType;
  required?: boolean;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  default?: any;
  primary?: boolean;
  readonly?: boolean;
  foreign?: string;
  'soft-delete'?: boolean;
  values?: string[]; // For enum type
}

export interface ModelDefinition {
  fields: Record<string, FieldDefinition>;
  indexes?: (string | string[])[];
  validate?: string; // Reference to logic module validator
}

export interface ModelSchema {
  [modelName: string]: ModelDefinition;
}

export interface StoreConfig {
  backend: 'local' | 'remote' | 'hybrid' | 'memory';
  persistence?: {
    driver: 'localStorage' | 'indexeddb';
    dbName?: string;
    keyPrefix?: string;
  };
  baseUrl?: string;
  auth?: {
    type: 'bearer' | 'api-key' | 'custom';
    token?: string;
    header?: string;
  };
  sync?: {
    strategy: 'last-write-wins' | 'local-preferred' | 'crdt' | 'custom';
    batchInterval?: number;
    conflictHandler?: string;
    optimisticWrites?: boolean;
    fallbackWhenOffline?: 'local' | 'error';
  };
  seedData?: Record<string, any[]>;
  models?: ModelSchema;
}

export interface Meta {
  version: number;
  lastSync?: number;
  syncInProgress?: boolean;
}

export interface Change {
  op: 'create' | 'update' | 'delete';
  model: string;
  id: any;
  data?: any;
  before?: any;
  after?: any;
  timestamp: number;
}

export interface Operation {
  method: 'create' | 'update' | 'delete';
  model: string;
  id?: any;
  data?: any;
}

export interface TransactionResult {
  success: boolean;
  results: any[];
  errors?: any[];
}

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  conflicts: number;
  timestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export interface StorageAdapter {
  name: string;
  config: StoreConfig;

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // CRUD operations
  get(model: string, id: any): Promise<any>;
  set(model: string, id: any, data: any): Promise<void>;
  delete(model: string, id: any): Promise<void>;
  list(model: string, filter?: any, sort?: any[]): Promise<any[]>;

  // Batch operations
  batchSet(ops: Array<[model: string, id: any, data: any]>): Promise<void>;
  batchDelete(ops: Array<[model: string, id: any]>): Promise<void>;

  // Metadata
  getMeta(model: string): Promise<Meta>;
  setMeta(model: string, meta: Meta): Promise<void>;
  
  // Utilities
  clear(model?: string): Promise<void>;
  dump(model?: string): Promise<Record<string, any>>;
}

export interface StoreSubscriber {
  (change: Change): void;
}

export interface DirtySubscriber {
  (model: string, ids: any[]): void;
}

export interface ConflictResolver {
  (local: any, remote: any, model: string): any;
}
