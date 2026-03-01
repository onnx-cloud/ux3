# Built-In Plugins

UX3 ships with a set of core plugins that provide common SPA functionality.
These are automatically available to applications and can be overridden or
extended if necessary.

## Available Plugins

| Name       | Purpose                                          | Provided Services/Directives |
|------------|--------------------------------------------------|------------------------------|
| `spa-core` | Handles hydration, state recovery, service reconnection | `ux3.service.state`, `ux3.service.reconnect` |
| `spa-router` | Client-side routing and URL sync               | `ux3.service.router`         |
| `spa-forms` | Form validation and payload extraction          | `ux3.service.forms` + directives `ux-form-submit`, `ux-form-validate` |
| `spa-auth` | JWT/OAuth session management                     | `ux3.service.auth`           |

## Installation

Built-in plugins are installed automatically when the app context is created
(see `examples/iam/app.ts`):

```ts
const plugins = [SpaCore, SpaRouter, SpaForms, SpaAuth];
plugins.forEach(p => p.install?.(appContext));
```

The `PluginRegistry` may also be used to manage registration order or to
query which plugins are active.

## Extension Points

Each plugin exposes hooks that run during the app lifecycle.  You may attach
additional hooks or provide replacement services via another plugin or your
own project code.

### Example: Listen for hydration completion

```ts
app.hooks.on(AppLifecyclePhase.HYDRATE, (ctx) => {
  ctx.app.logger.log('app.custom.hydrated');
});
```

### Example: Override authentication service

```ts
export default {
  name: 'custom-auth',
  version: '1.0.0',
  services: {
    'ux3.service.auth': MyCustomAuthService
  }
};
```

## Testing

The `src/plugins/__tests__/builtins.test.ts` file asserts that all plugins
export valid names/versions and can be registered without conflict.

Additional integration tests reside in the `examples/iam/__tests__` directory
and verify that the services are present after initialization.
