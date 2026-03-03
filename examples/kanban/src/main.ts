import createBootstrap from '@ux3/ui/bootstrap';
import { config } from './generated/config.js';
// ensure views are defined
import './generated/views/index.js';

export const initApp = createBootstrap(config);
export const hydrate = initApp;
export { config };
