# @ux3/plugin-store

Storage plugin for UX3 with support for localStorage, IndexedDB, remote sync, and hybrid patterns

## Features

- LocalStorage, IndexedDB, and remote storage adapters
- Declarative service-driven persistence
- Optimistic writes with offline-first sync
- Schema validation and type-safe CRUD APIs
- Transaction and bulk operation support

## Installation

```bash
npm install @ux3/plugin-store
```

## Basic Usage

```ts
import StorePlugin from '@ux3/plugin-store';

const app = initializeApp({
  plugins: [StorePlugin],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Use `app.utils.Store` as the storage constructor.
- Services and adapters can be built on top of the plugin's `Store` class.

## API

- `app.utils.Store` — storage constructor exposed by the plugin.
- `Store.create(model, data)` — create a record.
- `Store.find(model, filter?)` — query multiple records.
- `Store.findOne(model, id)` — query a single record.
- `Store.update(model, id, data)` — update a record.
- `Store.delete(model, id)` — delete a record.

## Example

```ts
const store = new app.utils.Store({
  backend: 'local',
  persistence: {
    driver: 'localStorage',
    keyPrefix: 'myapp:',
  },
});

await store.create('tasks', { id: '1', title: 'Buy milk', done: false });
const tasks = await store.find('tasks', { done: false });
console.log(tasks);
```

## Notes

- The plugin exposes the storage utility but does not inject a fixed runtime store instance by default.
- Use the `Store` constructor in app services or custom plugin code.
