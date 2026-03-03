// central entry point for the core framework (published as @ux3/ux3)

// re-export all public APIs from submodules so that consumers can simply
// import from the package root without relying on tsconfig path mappings.

export * from './plugin/registry';
export * from './fsm/index';
export * from './ui/index';
export * from './services/index';
export * from './validation/index';
export * from './state/index';
export * from './security/index';
export * from './a11y/index';
