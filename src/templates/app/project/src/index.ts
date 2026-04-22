// Minimal bootstrap entry – not required for the framework to
// operate and safe to delete in a code-free project. Advanced apps
// can customise or extend this file as needed; see `@ux3/ui/bootstrap`.

import createBootstrap from '@ux3/ui/bootstrap';
import { config } from './generated/config.js';

// default initializer exposed for hydration scripts
export const initApp = createBootstrap(config);
export const hydrate = initApp;
