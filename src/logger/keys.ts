// Predefined message keys used by the logging system.
// Plugins and framework components should import these constants instead of
// hard-coding strings.

export const SYS = {
  APP_INIT: 'sys.app.init',
  APP_CONFIG: 'sys.app.config',
  APP_BUILD: 'sys.app.build',
  APP_HYDRATE: 'sys.app.hydrate',
  APP_READY: 'sys.app.ready',
  APP_DESTROY: 'sys.app.destroy',

  PLUGIN_REGISTER: 'sys.plugin.register',
  PLUGIN_INSTALL: 'sys.plugin.install',
  PLUGIN_ERROR: 'sys.plugin.error',

  COMPONENT_CREATE: 'sys.component.create',
  COMPONENT_MOUNT: 'sys.component.mount',
  COMPONENT_RENDER: 'sys.component.render',
  COMPONENT_UPDATE: 'sys.component.update',
  COMPONENT_UNMOUNT: 'sys.component.unmount',

  SERVICE_CONNECT: 'sys.service.connect',
  SERVICE_ERROR: 'sys.service.error',
  SERVICE_RECONNECT: 'sys.service.reconnect'
};

// Application/domain-specific keys may be defined in apps/plugins.
