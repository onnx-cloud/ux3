import type { Plugin } from '../../src/plugin/registry';
import { AuthService } from '../../src/plugins/spa-auth';

export default {
  name: 'iam-auth-custom',
  version: '1.0.0',
  services: {
    'iam.service.custom-auth': AuthService
  }
} as Plugin;