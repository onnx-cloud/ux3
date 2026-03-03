# @ux3/plugin-store — Quick Reference

## Installation

The plugin is included in UX3. Enable it in `ux/ux3.yaml`:

```yaml
plugins:
  - name: '@ux3/plugin-store'
```

## Quick Start

### 1. Declare Storage Service

File: `ux/service/services.yaml`

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

File: `ux/view/tasks.yaml`

```yaml
initial: loading

states:
  loading:
    invoke:
      service: store.local
      method: find
      input:
        model: tasks
        filter: { done: false }
    on:
      SUCCESS: ready
      ERROR: error

  ready:
    template: 'view/tasks-list.html'
```

### 3. Access in Logic

```typescript
// Access store instance
const store = await app.services['store.local'];

// Create
const task = await store.create('tasks', {
  title: 'Buy milk',
  done: false
});

// Read
const tasks = await store.find('tasks', { done: false });

// Update
await store.update('tasks', task.id, { done: true });

// Delete
await store.delete('tasks', task.id);
```

## Common Patterns

### Filtering

```yaml
invoke:
  method: find
  input:
    model: tasks
    filter: { done: false, priority: high }
```

### Sorting

```yaml
invoke:
  method: find
  input:
    model: tasks
    sort:
      - field: created
        dir: desc
```

### Creating with Auto-ID

```typescript
const item = await store.create('tasks', {
  title: 'Task 1',
  // id auto-generated
});
```

### Transactions

```typescript
const result = await store.transaction([
  { method: 'create', model: 'tasks', data: { title: 'Task 1' } },
  { method: 'create', model: 'tasks', data: { title: 'Task 2' } },
  { method: 'update', model: 'projects', id: '1', data: { updated: Date.now() } }
]);

if (result.success) {
  console.log('All operations succeeded');
} else {
  console.log('Some operations failed:', result.errors);
}
```

### Reactive Updates

```typescript
// Listen for changes
store.subscribe('tasks', (change) => {
  console.log(`${change.op}:`, change.id, change.data);
});

// Listen for dirty (changed) items
store.onDirty('tasks', (model, ids) => {
  console.log(`Changed items: ${ids}`);
});
```

## Adapter Comparison

| Feature | Local | Remote | Hybrid | Memory |
|---------|-------|--------|--------|--------|
| Works Offline | ✅ | ❌ | ✅ | ✅ |
| Remote Sync | ❌ | ✅ | ✅ | ❌ |
| Filtering | ✅ | ✅ | ✅ | ✅ |
| Transactions | ✅ | ✅ | ✅ | ✅ |
| Use for | Dev & Client | Server | Teams | Testing |

## Configuration Pre-sets

### Development (localStorage)

```yaml
store.dev:
  adapter: plugin
  backend: local
  persistence:
    driver: localStorage
    keyPrefix: 'dev:'
```

### Production (IndexedDB)

```yaml
store.prod:
  adapter: plugin
  backend: local
  persistence:
    driver: indexeddb
    dbName: myapp-db
```

### Team Sync (Hybrid)

```yaml
store.sync:
  adapter: plugin
  backend: hybrid
  local:
    persistence:
      driver: indexeddb
      dbName: myapp-db
  remote:
    baseUrl: https://api.example.com/data
    auth: { type: bearer }
  sync:
    strategy: crdt
    batchInterval: 5000
    optimisticWrites: true
```

## Testing

```typescript
import { Store } from '@ux3/plugin-store';

describe('My App', () => {
  it('should manage tasks', async () => {
    // Create memory-backed store
    const store = new Store({
      backend: 'memory',
      seedData: {
        tasks: [
          { id: '1', title: 'Task 1', done: false }
        ]
      }
    });
    
    await store.connect();
    
    // Test operations
    const tasks = await store.find('tasks');
    expect(tasks.length).toBe(1);
    
    await store.disconnect();
  });
});
```

## Troubleshooting

### localStorage is Full

```typescript
const dump = await store.dump();
console.log('Storage:', JSON.stringify(dump).length, 'bytes');
// Max: ~5-10MB
```

### Offline Issues

```typescript
// Check connection
if (store.isConnected()) {
  await store.sync();
}

// Listen to dirty changes
store.onDirty('tasks', (model, ids) => {
  console.log('Items waiting to sync:', ids);
});
```

### Type Issues

Use model schema to validate:

```yaml
models:
  tasks:
    fields:
      title:
        type: string
        required: true
        maxLength: 200
```

## API Summary

### CRUD
- `create(model, data)` 
- `findOne(model, id)`
- `find(model, filter?, sort?)`
- `update(model, id, data)`
- `upsert(model, id, data)`
- `delete(model, id)`

### Bulk
- `bulkCreate(model, items)`
- `bulkUpdate(model, updates)`
- `transaction(operations)`

### Reactive
- `subscribe(model, listener)` → `unsubscribe()`
- `onDirty(model, listener)` → `unsubscribe()`

### Utilities
- `dump(model?)` 
- `clear(model?)`
- `sync()` → (hybrid only)
- `connect()`
- `disconnect()`
- `isConnected()`

## Links

- [Full Documentation](../packages/@ux3/plugin-store/README.md)
- [API Reference](../packages/@ux3/plugin-store/README.md#api-reference)
- [Examples](../examples/kanban/ux/service/services.yaml)
- [Tests](../tests/plugin-store/)

---

**Version:** 1.0.0 | **Status:** Production-ready
