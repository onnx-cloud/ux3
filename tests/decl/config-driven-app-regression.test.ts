import path from 'path';
import fs from 'fs-extra';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { compileAllViews } from '../../src/build/view-compiler.ts';
import { Validator } from '../../src/build/validator.ts';
import {
  deepMerge,
  getConfigValue,
  loadConfig,
  setConfigValue,
} from '../../src/cli/config-loader.ts';
import { StateMachine } from '../../src/fsm/state-machine.ts';

const TMP_ROOT = path.join(process.cwd(), 'tests', 'tmp', 'config-driven-app-regression');

interface DeclarativeProjectOptions {
  viewName: string;
  stateNames: string[];
  routeView?: string;
  malformedRoutesYaml?: boolean;
  malformedServicesYaml?: boolean;
}

async function writeDeclarativeProject(rootDir: string, options: DeclarativeProjectOptions): Promise<void> {
  const {
    viewName,
    stateNames,
    routeView = viewName,
    malformedRoutesYaml = false,
    malformedServicesYaml = false,
  } = options;

  const viewDir = path.join(rootDir, 'ux', 'view');
  const routeDir = path.join(rootDir, 'ux', 'route');
  const serviceDir = path.join(rootDir, 'ux', 'service');
  const servicesImplDir = path.join(rootDir, 'ux', 'services');
  const layoutDir = path.join(rootDir, 'ux', 'layout');

  await fs.ensureDir(viewDir);
  await fs.ensureDir(routeDir);
  await fs.ensureDir(serviceDir);
  await fs.ensureDir(servicesImplDir);
  await fs.ensureDir(layoutDir);

  const stateMap = stateNames
    .map((state) => `  ${state}: ${viewName}-${state}.html`)
    .join('\n');

  const viewYaml = [
    `name: ${viewName}`,
    `initial: ${stateNames[0]}`,
    'states:',
    stateMap,
  ].join('\n');

  await fs.writeFile(path.join(viewDir, `${viewName}.yaml`), `${viewYaml}\n`, 'utf-8');

  for (const state of stateNames) {
    await fs.writeFile(
      path.join(viewDir, `${viewName}-${state}.html`),
      `<section data-state="${state}">${viewName}:${state}</section>\n`,
      'utf-8'
    );
  }

  await fs.writeFile(path.join(layoutDir, '_.html'), '<main id="shell"><slot></slot></main>\n', 'utf-8');

  if (malformedRoutesYaml) {
    await fs.writeFile(path.join(routeDir, 'routes.yaml'), 'routes: [\n', 'utf-8');
  } else {
    await fs.writeFile(
      path.join(routeDir, 'routes.yaml'),
      `routes:\n  - path: /\n    view: ${routeView}\n`,
      'utf-8'
    );
  }

  if (malformedServicesYaml) {
    await fs.writeFile(path.join(serviceDir, 'services.yaml'), 'services: [\n', 'utf-8');
  } else {
    await fs.writeFile(
      path.join(serviceDir, 'services.yaml'),
      'services:\n  api:\n    baseUrl: https://example.test\n',
      'utf-8'
    );
  }

  await fs.writeFile(path.join(servicesImplDir, 'index.mjs'), 'export default {};\n', 'utf-8');
}

function generatedFileName(viewName: string): string {
  return viewName === 'index' ? 'index-view.ts' : `${viewName}.ts`;
}

function makeCounterMachine(startCount: number): StateMachine<any> {
  return new StateMachine({
    id: 'counter',
    initial: 'ready',
    context: { count: startCount },
    states: {
      ready: {
        on: {
          INC: {
            target: 'ready',
            actions: [(ctx: any) => ({ count: ctx.count + 1 })],
          },
          DEC: {
            target: 'ready',
            actions: [(ctx: any) => ({ count: ctx.count - 1 })],
          },
          MUL2: {
            target: 'ready',
            actions: [(ctx: any) => ({ count: ctx.count * 2 })],
          },
          RESET: {
            target: 'ready',
            actions: [() => ({ count: 0 })],
          },
        },
      },
    },
  });
}

function applyEvent(current: number, event: string): number {
  if (event === 'INC') return current + 1;
  if (event === 'DEC') return current - 1;
  if (event === 'MUL2') return current * 2;
  return 0;
}

beforeAll(async () => {
  await fs.remove(TMP_ROOT);
  await fs.ensureDir(TMP_ROOT);
});

afterAll(async () => {
  await fs.remove(TMP_ROOT);
});

describe('Config-driven declarative build and validation', () => {
  const compileScenarios = Array.from({ length: 12 }, (_, idx) => {
    const stateCount = idx + 1;
    const stateNames = Array.from({ length: stateCount }, (_, i) => `s${i + 1}`);
    return {
      name: `compile view with ${stateCount} declarative states`,
      viewName: `screen-compile-${stateCount}`,
      stateNames,
    };
  });

  for (const scenario of compileScenarios) {
    it(scenario.name, async () => {
      const projectDir = path.join(TMP_ROOT, scenario.viewName);
      const outDir = path.join(projectDir, 'generated', 'views');

      await fs.remove(projectDir);
      await writeDeclarativeProject(projectDir, {
        viewName: scenario.viewName,
        stateNames: scenario.stateNames,
      });

      await compileAllViews(path.join(projectDir, 'ux', 'view'), outDir, projectDir);

      const compiledFile = path.join(outDir, generatedFileName(scenario.viewName));
      expect(await fs.pathExists(compiledFile)).toBe(true);

      const compiledContent = await fs.readFile(compiledFile, 'utf-8');
      expect(compiledContent).toContain(`ux-${scenario.viewName}`);
      expect(compiledContent).toContain(`"${scenario.stateNames[0]}"`);
    });
  }

  const invalidRouteScenarios = Array.from({ length: 12 }, (_, idx) => {
    const n = idx + 1;
    return {
      name: `flags route -> missing view variant ${n}`,
      projectName: `invalid-route-${n}`,
      viewName: `screen-route-${n}`,
      missingView: `missing-view-${n}`,
    };
  });

  for (const scenario of invalidRouteScenarios) {
    it(scenario.name, async () => {
      const projectDir = path.join(TMP_ROOT, scenario.projectName);

      await fs.remove(projectDir);
      await writeDeclarativeProject(projectDir, {
        viewName: scenario.viewName,
        stateNames: ['idle'],
        routeView: scenario.missingView,
      });

      const result = await new Validator({
        projectDir,
        schemas: {},
        enableAdvancedValidation: false,
      }).validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('non-existent view'))).toBe(true);
    });
  }

  const malformedYamlScenarios = Array.from({ length: 12 }, (_, idx) => {
    const n = idx + 1;
    return {
      name: `rejects malformed declarative yaml variant ${n}`,
      projectName: `malformed-yaml-${n}`,
      viewName: `screen-malformed-${n}`,
      malformedRoutesYaml: n % 2 === 1,
      malformedServicesYaml: n % 2 === 0,
    };
  });

  for (const scenario of malformedYamlScenarios) {
    it(scenario.name, async () => {
      const projectDir = path.join(TMP_ROOT, scenario.projectName);

      await fs.remove(projectDir);
      await writeDeclarativeProject(projectDir, {
        viewName: scenario.viewName,
        stateNames: ['idle'],
        malformedRoutesYaml: scenario.malformedRoutesYaml,
        malformedServicesYaml: scenario.malformedServicesYaml,
      });

      const result = await new Validator({
        projectDir,
        schemas: {},
        enableAdvancedValidation: false,
      }).validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('Failed to parse'))).toBe(true);
    });
  }
});

describe('Config-driven loader and mutation behavior', () => {
  const precedenceScenarios = Array.from({ length: 12 }, (_, idx) => idx + 1);

  for (const n of precedenceScenarios) {
    it(`merges declarative config precedence yaml < json < js variant ${n}`, async () => {
      const projectDir = path.join(TMP_ROOT, `config-precedence-${n}`);
      const configDir = path.join(projectDir, 'configs');

      await fs.remove(projectDir);
      await fs.ensureDir(configDir);

      await fs.writeFile(
        path.join(configDir, '01-base.yaml'),
        [
          'routes:',
          `  - path: /yaml-${n}`,
          'services:',
          '  api: { baseUrl: https://yaml.example }',
          'tokens:',
          `  source: yaml-${n}`,
        ].join('\n') + '\n',
        'utf-8'
      );

      await fs.writeJson(path.join(configDir, '02-overrides.json'), {
        routes: [{ path: `/json-${n}` }],
        tokens: { source: `json-${n}` },
      });

      await fs.writeFile(
        path.join(projectDir, 'ux3.config.ts'),
        `export default {
  routes: [{ path: '/js-${n}' }],
  services: { api: { baseUrl: 'https://js.example' } },
  tokens: { source: 'js-${n}' }
};\n`,
        'utf-8'
      );

      const cfg = await loadConfig(projectDir);
      expect((cfg.routes as any[])[0].path).toBe(`/js-${n}`);
      expect((cfg.tokens as any).source).toBe(`js-${n}`);
    });
  }

  const mandatoryScenarios = Array.from({ length: 12 }, (_, idx) => idx + 1);

  for (const n of mandatoryScenarios) {
    it(`enforces mandatory declarative keys variant ${n}`, async () => {
      const projectDir = path.join(TMP_ROOT, `config-mandatory-${n}`);
      const configDir = path.join(projectDir, 'configs');
      await fs.remove(projectDir);
      await fs.ensureDir(configDir);

      const includeRoutes = n % 3 !== 0;
      const includeServices = n % 4 !== 0;
      const includeTokens = n % 5 !== 0;

      const lines: string[] = [];
      if (includeRoutes) {
        lines.push('routes:', '  - path: /ok');
      }
      if (includeServices) {
        lines.push('services:', '  api: { baseUrl: https://ok.example }');
      }
      if (includeTokens) {
        lines.push('tokens:', `  version: ${n}`);
      }

      await fs.writeFile(path.join(configDir, 'main.yaml'), `${lines.join('\n')}\n`, 'utf-8');

      const shouldPass = includeRoutes && includeServices && includeTokens;
      if (shouldPass) {
        await expect(loadConfig(projectDir)).resolves.toBeTruthy();
      } else {
        await expect(loadConfig(projectDir)).rejects.toThrow(/Missing mandatory config keys/);
      }
    });
  }

  const pathMutationScenarios = Array.from({ length: 12 }, (_, idx) => idx + 1);

  for (const n of pathMutationScenarios) {
    it(`applies dot-path config mutations variant ${n}`, () => {
      const cfg: any = {
        routes: [{ path: '/' }],
        services: {},
        tokens: {},
      };

      setConfigValue(cfg, `tokens.palette.c${n}`, `#${n}${n}${n}`);
      setConfigValue(cfg, `services.api${n}.baseUrl`, `https://service-${n}.example`);

      expect(getConfigValue(cfg, `tokens.palette.c${n}`)).toBe(`#${n}${n}${n}`);
      expect(getConfigValue(cfg, `services.api${n}.baseUrl`)).toBe(`https://service-${n}.example`);
      expect(getConfigValue(cfg, 'tokens.palette.missing', 'fallback')).toBe('fallback');
    });
  }

  it('supports deepMerge for layered declarative overrides', () => {
    const merged = deepMerge(
      {
        routes: [{ path: '/' }],
        tokens: { color: { primary: '#111' } },
      } as any,
      {
        tokens: { color: { accent: '#0af' } },
      } as any,
      {
        tokens: { color: { primary: '#222' } },
      } as any
    );

    expect((merged.tokens as any).color.primary).toBe('#222');
    expect((merged.tokens as any).color.accent).toBe('#0af');
  });
});

describe('Config-driven FSM behavior under declarative changes', () => {
  const eventSet = ['INC', 'DEC', 'MUL2', 'RESET'];

  const fsmScenarios = Array.from({ length: 36 }, (_, idx) => {
    const start = idx % 5;
    const sequence = [
      eventSet[idx % 4],
      eventSet[(idx + 1) % 4],
      eventSet[(idx + 2) % 4],
      eventSet[(idx + 3) % 4],
    ];

    // Keep runtime bounded while still varying config-driven behavior.
    const events = sequence.slice(0, 2 + (idx % 3));

    const expected = events.reduce((count, evt) => applyEvent(count, evt), start);

    return {
      name: `executes declarative FSM sequence ${idx + 1}`,
      start,
      events,
      expected,
    };
  });

  for (const scenario of fsmScenarios) {
    it(scenario.name, () => {
      const machine = makeCounterMachine(scenario.start);

      for (const evt of scenario.events) {
        machine.send(evt);
      }

      expect(machine.getState()).toBe('ready');
      expect(machine.getContext().count).toBe(scenario.expected);
    });
  }
});
