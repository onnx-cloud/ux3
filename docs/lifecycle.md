# Lifecycle Hooks

UX3 exposes a uniform hook mechanism that allows plugins and core code to
inject behavior at well-defined points in the application, component, and
service lifecycles. Hooks are ordered and asynchronous - each handler runs in
registration order and may return a promise.

## Domains & Phases

### App Lifecycle (6 phases)
- `INIT` – framework and plugins have loaded; configuration is available
- `CONFIG` – configuration values have been applied
- `BUILD` – FSMs, services and widgets have been instantiated
- `HYDRATE` – SSR state has been recovered (called by hydration code)
- `READY` – application is interactive; user can send events
- `DESTROY` – application teardown

### Component Lifecycle (6 phases)
- `CREATE` – component constructor executed
- `MOUNT` – component has been attached to the DOM
- `RENDER` – component performed its initial render
- `UPDATE` – reactive state changed and view re‑rendered
- `UNMOUNT` – component removed from DOM
- `DESTROY` – cleanup (listeners, timers, etc.)

### Service Lifecycle (7 phases)
- `REGISTER` – service registered with the service registry
- `CONNECT` – network connection established (e.g. WebSocket opened)
- `AUTHENTICATE` – authentication handshake completed
- `READY` – service ready for requests
- `ERROR` – an error occurred within the service
- `RECONNECT` – service attempting to reconnect (after failure)
- `DISCONNECT` – service explicitly disconnected

## Using Hooks

```ts
import { AppLifecyclePhase } from '@ux3/core/lifecycle';

app.hooks.on(AppLifecyclePhase.READY, async (ctx) => {
  // run code when app becomes interactive
  ctx.app.logger.log('app.ready', { time: Date.now() });
});
```

Plugins declare hooks in their export object instead of manually registering:

```ts
export default {
  name: 'my-plugin',
  hooks: {
    app: {
      [AppLifecyclePhase.INIT]: [async (ctx) => {
        // initialization logic
      }]
    }
  }
};
```

## HookContext

Every hook receives a `HookContext` object:

```ts
interface HookContext {
  app?: AppContext;
  component?: any; // UI component instance if applicable
  service?: any;   // service instance if applicable
  phase: string;   // the phase being executed
  meta?: Record<string, any>; // optional metadata
}
```

The context varies depending on domain; when executing an app hook only
`app` and `phase` are guaranteed to be present.
