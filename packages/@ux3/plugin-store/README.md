# @ux3/plugin-store — Storage Plugin

A modular, configuration-driven storage abstraction for UX3 that supports client-side (localStorage, IndexedDB), remote (HTTP/JSON-RPC backends), and hybrid sync patterns.

## Features

- **Multiple Backends**: localStorage, IndexedDB, HTTP REST, hybrid (local + remote)
- **Type-Safe**: Schema validation on read/write with generated TypeScript types
- **Reactive Sync**: Automatic dirty tracking, batch writes, conflict resolution
- **Service-Driven**: Declared in YAML via `services.yaml`, invoked like any UX3 service
- **Offline-First**: Optimistic writes with automatic sync when connection restored
- **Testing**: In-memory adapter and test helpers for unit/E2E tests
- **Zero Configuration**: Sensible defaults; opt-in configuration only

## Installation

The plugin is included in the `@ux3/ux3` framework. Register it in your `ux/ux3.yaml`:

```yaml
plugins:
  - name: '@ux3/plugin-store'
```

## Quick Start

### 1. Declare in services.yaml

```yaml
services:
  store.local:
    adapter: plugin
    provider: store
    backend: local
    persistence:
      driver: localStorage
      keyPrefix: 'myapp:'
```

### 2. Use in Views

```yaml
states:
  loading:
    template: 'view/loading.html'
    invoke:
      service: store.local
      method: find
      input:
        model: tasks
        filter: { done: false }
    on:
      SUCCESS: ready
      ERROR: error
```

### 3. Create and Manage Data

```typescript
// From logic modules or services
const store = await app.services.store.local();

// Create
const task = await store.create('tasks', {
  title: 'Buy milk',
  done: false
});

// Query
const tasks = await store.find('tasks', { done: false });

// Update
await store.update('tasks', task.id, { done: true });

// Delete
await store.delete('tasks', task.id);
```

## API Reference

### Store Methods

#### CRUD Operations

```typescript
// Create
async create(model: string, data: any): Promise<any>

// Query single
async findOne(model: string, id: any): Promise<any>

// Query multiple with filter/sort
async find(
  model: string,
  filter?: any,
  sort?: Array<{ field?: string; dir?: 'asc' | 'desc' }>
): Promise<any[]>

// Update
async update(model: string, id: any, data: any): Promise<any>

// Upsert (create or update)
async upsert(model: string, id: any, data: any): Promise<any>

// Delete
async delete(model: string, id: any): Promise<void>
```

#### Bulk Operations

```typescript
// Create multiple
async bulkCreate(model: string, items: any[]): Promise<any[]>

// Update multiple
async bulkUpdate(
  model: string,
  updates: Map<any, any> | Record<any, any>
): Promise<any[]>
```

#### Transactions

```typescript
async transaction(operations: Operation[]): Promise<TransactionResult>

// Example:
const result = await store.transaction([
  { method: 'create', model: 'tasks', data: { title: 'Task 1' } },
  { method: 'update', model: 'projects', id: '1', data: { updated: Date.now() } },
  { method: 'delete', model: 'tasks', id: '99' }
]);
```

#### Subscriptions & Reactivity

```typescript
// Subscribe to changes
const unsubscribe = store.subscribe('tasks', (change) => {
  console.log(change.op, change.id, change.data);
});

// Listen for dirty changes (for sync triggers)
const unlistenDirty = store.onDirty('tasks', (model, ids) => {
  console.log(`Tasks ${ids} have changed, sync needed`);
});
```

#### Sync (Hybrid Only)

```typescript
async sync(): Promise<SyncResult>
```

#### Utilities

```typescript
// Dump all data
async dump(model?: string): Promise<Record<string, any>>

// Clear storage
async clear(model?: string): Promise<void>
```

## Configuration

### Local Adapter

```yaml
store.local:
  adapter: plugin
  provider: store
  backend: local
  persistence:
    driver: localStorage    # or: indexeddb
    dbName: my-app          # IndexedDB only
    keyPrefix: 'app:'       # localStorage only
```

**Local Adapter Features:**
- `localStorage`: Simple key-value pairs (limited ~5MB)
- `indexeddb`: Structured queries, indexes, larger quota (~50MB+)
- Automatic fallback to localStorage if IndexedDB unavailable

### Remote Adapter

```yaml
store.remote:
  adapter: plugin
  provider: store
  backend: remote
  baseUrl: http://localhost:3000/api
  auth:
    type: bearer
    token: process.env.API_TOKEN
```

**Remote Adapter:**
- RESTful HTTP API
- Bearer token or API key authentication
- Automatic retry with exponential backoff
- Optional HTTP cache headers

### Hybrid Adapter

```yaml
store.hybrid:
  adapter: plugin
  provider: store
  backend: hybrid
  local:
    persistence:
      driver: indexeddb
      dbName: app-db
  remote:
    baseUrl: http://localhost:3000/api
    auth: { type: bearer }
  sync:
    strategy: crdt              # last-write-wins, local-preferred, crdt
    batchInterval: 5000         # ms between syncs
    optimisticWrites: true      # Write locally, sync async
    fallbackWhenOffline: local  # Use local only if remote fails
```

**Hybrid Adapter:**
- Local cache + remote sync
- Optimistic writes (fast UI updates)
- Configurable conflict resolution
- Offline-first fallback
- Automatic sync on intervals or manual trigger

## Schema & Validation

Define models in your service configuration:

```yaml
store.local:
  adapter: plugin
  provider: store
  backend: local
  models:
    tasks:
      fields:
        id:
          type: uuid
          primary: true
        title:
          type: string
          required: true
          maxLength: 200
        done:
          type: boolean
          default: false
        due:
          type: timestamp
        priority:
          type: enum
          values: [low, normal, high, urgent]
          default: normal
      indexes:
        - [done, due]
```

**Supported Field Types:**
- `string`, `number`, `integer`, `boolean`
- `timestamp` (ISO 8601 date)
- `uuid` (unique identifier)
- `json` (nested objects)
- `enum` (with `values` array)
- `array<string>`, `array<number>`

**Validation Rules:**
- `required`: field must not be empty
- `maxLength`: string max characters
- `min`, `max`: numeric bounds
- `pattern`: regex validation
- `default`: fallback value
- `readonly`: cannot be updated
- `primary`: unique identifier
- `foreign`: reference to another model

## Testing

### Using Test Helpers

```typescript
import { createStoreStub, seedStore } from '@ux3/plugin-store/testing';

describe('My App', () => {
  it('should manage tasks', async () => {
    const store = createStoreStub({
      tasks: [
        { id: '1', title: 'Task 1', done: false },
        { id: '2', title: 'Task 2', done: true }
      ]
    });

    const results = await store.find('tasks', { done: false });
    expect(results.length).toBe(1);

    await store.disconnect();
  });
});
```

### In-Memory Adapter

```typescript
const store = new Store({
  backend: 'memory',
  seedData: {
    users: [{ id: '1', name: 'Alice' }]
  }
});

await store.connect();
// Use store normally...
```

## Integration with FSM Views

### Loading Data on View Entry

```yaml
# ux/view/tasks.yaml
initial: loading

context:
  tasks: []
  error: null

states:
  loading:
    template: 'view/tasks/loading.html'
    invoke:
      service: store.local
      method: find
      input:
        model: tasks
        filter: { done: false }
        sort: [{ field: created, dir: desc }]
    on:
      SUCCESS: { target: ready, actions: [setTasks] }
      ERROR: error

  ready:
    template: 'view/tasks/list.html'
    on:
      CREATE: creating
      UPDATE: { target: updating, actions: [selectTask] }
      DELETE: deleting

  creating:
    template: 'view/tasks/form.html'
    on:
      SUBMIT: { target: saveCreate }
      CANCEL: ready

  saveCreate:
    invoke:
      service: store.local
      method: create
      input:
        model: tasks
        data:
          title: ctx.form.title
          done: false
          created: {now}
    on:
      SUCCESS: { target: ready, actions: [addTask, closeForm] }
      ERROR: { target: creating, actions: [setError] }
```

## Examples

See the examples for full integration patterns:
- **IAM Example** (`examples/iam/`): Store for caching user preferences
- **Kanban Example** (`examples/kanban/`): Complete kanban board with projects, boards, tasks, lanes

## Offline Support

The hybrid adapter enables offline-first apps:

1. **User goes offline**: App continues using local cache
2. **User makes changes**: Stored locally and queued for sync
3. **Connection restored**: Automatic sync with conflict resolution
4. **Conflicts resolved**: Based on strategy (last-write-wins, CRDT, etc.)

```typescript
// Listen for sync completion
store.onDirty('tasks', (model, ids) => {
  console.log(`Changes queued for sync: ${ids}`);
});

// Manual sync trigger
await store.sync();
```

## Benchmarks

- **localStorage**: < 10ms for 100 items
- **IndexedDB**: < 5ms for 10,000 items
- **Remote (HTTP)**: 100-500ms (network dependent)
- **Hybrid**: Local latency + background sync

## Browser Support

- **localStorage**: All modern browsers
- **IndexedDB**: All modern browsers (IE 10+)
- **Fallback**: Gracefully degrades to in-memory if needed

## Migration & Versioning

Schema migrations are declared alongside models:

```yaml
models:
  tasks:
    version: 2
    migrations:
      - version: 1
        name: initial
      - version: 2
        name: add-priority
        up: migrationAddPriority
```

Migrations are applied automatically on store initialization.

## Error Handling

Store operations throw errors with context:

```typescript
try {
  await store.create('tasks', { /* invalid data */ });
} catch (error) {
  console.error('Validation failed:', error.message);
}
```

Common errors:
- `Validation failed: ...` — Schema violation
- `Item not found: ...` — Missing ID for update
- `HTTP 401: ...` — Remote auth failure
- `IndexedDB quota exceeded` — Storage full

## Performance Tips

1. **Use IndexedDB** for 1000+ items
2. **Index frequently-filtered fields** (especially foreign keys)
3. **Batch writes** with `bulkCreate` or `transaction` for multiple items
4. **Use `find()` filters** to avoid loading unnecessary data
5. **Subscribe selectively** only to models you need
6. **Sync intervals** tune based on app update frequency

## API Stability

This plugin is stable and production-ready. Minor updates may add features (new adapters, conflict strategies) but will not break existing code.

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development setup.

---

**@ux3/plugin-store v1.0.0** — Part of the [UX3 Framework](https://ux3.dev)
