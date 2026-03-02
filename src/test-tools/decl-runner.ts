import fs from 'fs';
import { parse } from 'yaml';
import { FSMRegistry } from '../fsm/registry';

// simple internal assertion helper; tests can catch thrown Error
function assert(cond: boolean, msg?: string) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

export type RunnerType = 'unit' | 'playwright';
export interface RunnerOptions {
  runner: RunnerType;
  page?: any; // Playwright Page
}

// generic scenario definitions
interface Scenario {
  name?: string;
  steps: Step[];
}

type Step =
  | EventStep
  | InputStep
  | ClickStep
  | WaitStep
  | AssertStep
  | AssertStateStep
  | FSMStateStep
  | MacroStep
  | FixtureStep;

interface MacroStep extends BaseStep {
  type: 'macro';
  name: string;
}

interface FixtureStep extends BaseStep {
  type: 'fixture';
  module: string;
  function?: string;
  args?: any;
}

interface BaseStep {
  type: string;
  condition?: string; // for wait/conditional
  when?: string; // guard expression (optional)
}

interface EventStep extends BaseStep {
  type: 'event';
  name: string;
  payload?: any;
  machine?: string;
}

interface InputStep extends BaseStep {
  type: 'input';
  selector: string;
  text: string;
}

interface ClickStep extends BaseStep {
  type: 'click';
  selector: string;
}

interface WaitStep extends BaseStep {
  type: 'wait';
  timeout?: number;
}

interface AssertStep extends BaseStep {
  type: 'assert';
  selector: string;
  text?: string;
  exists?: boolean;
}

interface AssertStateStep extends BaseStep {
  type: 'assertState';
  path: string;
  equals: any;
  machine?: string;
}

interface FSMStateStep extends BaseStep {
  type: 'fsmState';
  machine?: string;
  equals: string | string[] | RegExp;
}

function evalGuard(cond: string | undefined, ctx: any): boolean {
  if (!cond) return true;
    // Our guard expressions are simple comparisons against context values.
    // Rather than using the Function constructor (which trips the no-implied-eval
    // rule), we parse common patterns manually. This keeps the linter happy
    // and avoids executing arbitrary code.
    // Supported syntax examples:
    //   ctx.foo === 'bar'
    //   ctx.count > 3
    //   ctx.flag != true
    const m = cond.match(/^\s*ctx\.([\w\.]+)\s*(===|==|!==|!=|<=|>=|<|>)\s*(.+)\s*$/);
    if (m) {
      const [, path, op, rhs] = m;
      const left = path.split('.').reduce((o: any, k) => (o && o[k] !== undefined ? o[k] : undefined), ctx);
      let right: any = rhs.trim();
      // try to coerce rhs to a primitive
      if (/^['"].*['"]$/.test(right)) {
        try {
          right = JSON.parse(right);
        } catch {
          // leave as string if parsing fails
          right = right.slice(1, -1);
        }
      } else if (/^(?:\d|\.)+$/.test(right)) {
        right = Number(right);
      } else if (right === 'true' || right === 'false') {
        right = right === 'true';
      }
      switch (op) {
        case '===': return left === right;
        case '==': return left == right; // eslint-disable-line eqeqeq
        case '!==': return left !== right;
        case '!=': return left != right; // eslint-disable-line eqeqeq
        case '<': return left < right;
        case '>': return left > right;
        case '<=': return left <= right;
        case '>=': return left >= right;
      }
    }
    // Fallback: if we couldn't parse, default to false so guard blocks progression
    return false;
  }

function resolvePath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

export async function runScenario(filePath: string, options: RunnerOptions) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const scenario = parse(raw) as Scenario;
  const page = options.page;
  const baseDir = require('path').dirname(filePath);

  const primaryMachine = () => {
    const all = Array.from(FSMRegistry.getAll().values());
    return all.length ? all[0] : null;
  };

  // helper to recursively execute steps (handles macros)
  const execSteps = async (steps: Step[]) => {
    for (const step of steps) {
      // guards
      if (!evalGuard(step.when, primaryMachine()?.getContext())) continue;

      if (step.type === 'macro') {
        if (!scenario.macros || !scenario.macros[step.name]) {
          throw new Error(`macro not defined: ${step.name}`);
        }
        await execSteps(scenario.macros[step.name]);
        continue;
      }

      if (step.type === 'fixture') {
        // load module and call function
        let modPath = step.module;
        if (!modPath.startsWith('/') && !modPath.match(/^\./)) {
          // allow bare package names
        } else {
          modPath = require('path').resolve(baseDir, modPath);
        }
        const mod = await import(modPath);
        const fn = step.function ? mod[step.function] : mod.default || mod.setup;
        if (typeof fn !== 'function') {
          throw new Error(`fixture module ${modPath} has no callable export`);
        }
        const payload = { FSMRegistry, page, options, args: step.args };
        await fn(payload);
        continue;
      }

      switch (step.type) {
      case 'event': {
        const fsm = step.machine ? FSMRegistry.get(step.machine) : primaryMachine();
        if (!fsm) throw new Error(`FSM not found for event step: ${step.machine}`);
        fsm.send({ type: step.name, ...step.payload });
        break;
      }

      case 'input': {
        if (options.runner === 'playwright' && page) {
          await page.fill(step.selector, step.text);
        } else {
          const el = document.querySelector(step.selector);
          if (!el) throw new Error(`selector not found: ${step.selector}`);
          el.value = step.text;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
        break;
      }

      case 'click': {
        if (options.runner === 'playwright' && page) {
          await page.click(step.selector);
        } else {
          const el = document.querySelector(step.selector);
          if (!el) throw new Error(`selector not found: ${step.selector}`);
          (el as any).click();
        }
        break;
      }

      case 'wait': {
        const timeout = step.timeout || 2000;
        const start = Date.now();
        while (true) {
          const ctx = primaryMachine()?.getContext();
          if (step.condition && evalGuard(step.condition, ctx)) break;
          if (Date.now() - start > timeout) throw new Error(`wait timeout: ${step.condition}`);
          await new Promise((r) => setTimeout(r, 50));
        }
        break;
      }

      case 'assert': {
        if (options.runner === 'playwright' && page) {
          const el = await page.$(step.selector);
          if (step.exists === false) {
            assert(el === null, `expected selector ${step.selector} to not exist`);
            break;
          }
          assert(el !== null, `selector ${step.selector} not found`);
          if (step.text !== undefined) {
            const txt = await page.textContent(step.selector);
            assert(txt?.includes(step.text), `text mismatch for ${step.selector}`);
          }
        } else {
          const el = document.querySelector(step.selector);
          if (step.exists === false) {
            assert(el === null, `expected selector ${step.selector} to not exist`);
            break;
          }
          assert(el !== null, `selector ${step.selector} not found`);
          if (step.text !== undefined) {
            assert(el!.textContent?.includes(step.text), `text mismatch for ${step.selector}`);
          }
        }
        break;
      }

      case 'assertState': {
        const machine = step.machine ? FSMRegistry.get(step.machine) : primaryMachine();
        if (!machine) throw new Error(`FSM not found for assertState: ${step.machine}`);
        const ctx = machine.getContext();
        const actual = resolvePath(ctx, step.path);
        assert(actual === step.equals, `state assertion failed: ${step.path} expected ${step.equals} got ${actual}`);
        break;
      }

      case 'fsmState': {
        const machine = step.machine ? FSMRegistry.get(step.machine) : primaryMachine();
        if (!machine) throw new Error(`FSM not found for fsmState: ${step.machine}`);
        const current = machine.getState();
        if (step.equals instanceof RegExp) {
          assert(step.equals.test(current), `fsmState ${current} does not match ${step.equals}`);
        } else if (Array.isArray(step.equals)) {
          assert(step.equals.includes(current), `fsmState ${current} not in [${step.equals.join(',')}]`);
        } else {
          assert(current === step.equals, `fsmState expected ${step.equals} got ${current}`);
        }
        break;
      }

      default:
        throw new Error(`unknown step type ${(step as any).type}`);
    }
  }
  }

  // execute scenario steps after helpers defined above
  await execSteps(scenario.steps);
}
