/**
 * Tenant SaaS journey tests
 *
 * These tests are driven by generated UX config for the tenant.saas example.
 * They exercise real FSM transitions and verify that routes continue to
 * map to declared view state machines.
 */

// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { StateMachine } from '../../../src/fsm/index.ts';
import { config } from '../../../examples/tenant.saas/generated/config';

const buildFSM = (name: string) => {
  const machineKey = `${name}FSM`;
  const machineConfig = config.machines[machineKey] ?? config.machines[name];

  if (!machineConfig) {
    throw new Error(`Tenant SaaS machine not found: ${machineKey}`);
  }

  return new StateMachine(machineConfig as any);
};

const requiredRouteViews = ['index', 'organization', 'membership', 'subscription', 'audit-log'];

describe('Tenant SaaS user journeys', () => {
  it('should keep core Tenant SaaS routes linked to state machines', () => {
    const paths = config.routes.map((route) => route.path);
    const views = config.routes.map((route) => route.view);

    for (const requiredView of requiredRouteViews) {
      expect(views).toContain(requiredView);
      expect(config.machines[`${requiredView}FSM`]).toBeDefined();
    }

    expect(paths).toContain('/');
    expect(paths).toContain('/organization');
    expect(paths).toContain('/membership');
    expect(paths).toContain('/subscription');
    expect(paths).toContain('/audit-log');
  });

  it('should include all referenced layouts in generated Tenant SaaS templates', () => {
    const exampleRoot = resolve(__dirname, '../../../examples/tenant.saas');
    const viewDir = resolve(exampleRoot, 'ux/view');
    const layoutNames = new Set<string>();

    for (const viewFile of readdirSync(viewDir).filter((path) => path.endsWith('.yaml'))) {
      const content = readFileSync(resolve(viewDir, viewFile), 'utf-8');
      const match = content.match(/^[ \t]*layout:\s*(?:['"]?)([\w-]+)(?:['"]?)\s*$/m);
      if (match) {
        layoutNames.add(match[1]);
      }
    }

    expect(layoutNames.size).toBeGreaterThan(0);

    for (const layoutName of layoutNames) {
      expect(config.templates[layoutName]).toBeDefined();
      expect(typeof config.templates[layoutName]).toBe('string');
      expect(config.templates[layoutName].trim().length).toBeGreaterThan(0);
    }
  });

  it('should transition index loading → dashboard and recover from loading failure', () => {
    const successFsm = buildFSM('index');

    expect(successFsm.getState()).toBe('loading');
    successFsm.send('SUCCESS');
    expect(successFsm.getState()).toBe('dashboard');

    const errorFsm = buildFSM('index');
    expect(errorFsm.getState()).toBe('loading');
    errorFsm.send('ERROR');
    expect(errorFsm.getState()).toBe('error');

    errorFsm.send('RETRY');
    expect(errorFsm.getState()).toBe('loading');
  });

  it('should exercise the organization edit and cancel journey', () => {
    const fsm = buildFSM('organization');

    expect(fsm.getState()).toBe('loading');
    fsm.send('SUCCESS');
    expect(fsm.getState()).toBe('viewing');

    fsm.send('EDIT');
    expect(fsm.getState()).toBe('editing');

    fsm.send('CANCEL');
    expect(fsm.getState()).toBe('viewing');
  });

  it('should exercise the membership invite UI path without guarded submit', () => {
    const fsm = buildFSM('membership');

    expect(fsm.getState()).toBe('loading');
    fsm.send('SUCCESS');
    expect(fsm.getState()).toBe('viewing');

    fsm.send('INVITE_USER');
    expect(fsm.getState()).toBe('inviting');

    fsm.send('CANCEL');
    expect(fsm.getState()).toBe('viewing');
  });

  it('should execute the subscription upgrade journey', () => {
    const fsm = buildFSM('subscription');

    expect(fsm.getState()).toBe('loading');
    fsm.send('SUCCESS');
    expect(fsm.getState()).toBe('viewing');

    fsm.send('OPEN_UPGRADE');
    expect(fsm.getState()).toBe('upgrade_choosing_plan');

    fsm.send({ type: 'SELECT_PLAN', plan: 'professional' });
    expect(fsm.getState()).toBe('confirming_upgrade');

    fsm.send('CONFIRM');
    expect(fsm.getState()).toBe('processing_upgrade');

    fsm.send('SUCCESS');
    expect(fsm.getState()).toBe('upgrade_complete');
  });

  it('should exercise the audit log filter and export journey', () => {
    const fsm = buildFSM('audit-log');

    expect(fsm.getState()).toBe('loading');
    fsm.send('SUCCESS');
    expect(fsm.getState()).toBe('viewing');

    fsm.send('OPEN_FILTERS');
    expect(fsm.getState()).toBe('filtering');

    fsm.send({ type: 'APPLY_FILTERS', filters: { entityType: 'organization' } });
    expect(fsm.getState()).toBe('loading');

    fsm.send('SUCCESS');
    expect(fsm.getState()).toBe('viewing');

    fsm.send('EXPORT_LOG');
    expect(fsm.getState()).toBe('exporting');

    fsm.send('SUCCESS');
    expect(fsm.getState()).toBe('viewing');
  });
});
