import { Store } from './store';
import type { StoreConfig } from './types';

/**
 * Storage Plugin for UX3 - Support for localStorage, IndexedDB, remote sync
 */
const StorePlugin = {
  name: '@ux3/plugin-store',
  version: '1.0.0',
  description: 'Modular storage plugin with local, remote, and hybrid adapters',
  ux3PeerVersion: '>=1.0.0',

  install(app: any) {
    // Register store utility
    (app as any).utils = (app as any).utils || {};
    (app as any).utils.Store = Store;
  }
};

export default StorePlugin;
export { Store } from './store';
export type { StoreConfig } from './types';
export * from './types';
