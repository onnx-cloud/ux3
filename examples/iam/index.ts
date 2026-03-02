import createBootstrap from '@ux3/ui/bootstrap';
import { config } from './generated/config.js';

// create and export the application bootstrap function
export const initApp = createBootstrap(config);
// alias for backwards compatibility
export const hydrate = initApp;

// re-export config so consumers (tests, bundles) can easily access it
export { config };
