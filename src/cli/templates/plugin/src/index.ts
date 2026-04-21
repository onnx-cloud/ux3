import type { Plugin } from '@ux3/ux3';

const [[ name ]]: Plugin = {
  name: '@ux3/plugin-[[ name ]]',
  version: '0.1.0',
  ux3PeerVersion: '^[[ ux3Version ]]',
  description: '[[ Name ]] plugin for UX3.',
  install(_app) {
    // Register components, services, directives, or hooks here.
  },
};

export default [[ name ]];
