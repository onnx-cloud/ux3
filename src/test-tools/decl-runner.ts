import fs from 'fs';
import { parse } from 'yaml';
import { FSMRegistry } from '../fsm/registry';
import { expect } from 'vitest';

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
  | FSMStateStep;

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
  /* eslint-disable no-new-func */
  return Function('ctx', `return (${cond})`)(ctx);
}

function resolvePath(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);
}

export async function runScenario(filePath: string, options: RunnerOptions) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const scenario = parse(raw) as Scenario;
  const page = options.page;

  const primaryMachine = () => {
    const all = Array.from(FSMRegistry.getAll().values());
    return all.length ? all[0] : null;
  };
  
  for (const step of scenario.steps) {
    // skip if guard fails
    if (!evalGuard(step.when, primaryMachine()?.getContext())) continue;

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
          const el = document.querySelector(step.selector) as any;
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
            expect(el).toBeNull();
            break;
          }
          expect(el).not.toBeNull();
          if (step.text !== undefined) {
            const txt = await page.textContent(step.selector);
            expect(txt).toContain(step.text);
          }
        } else {
          const el = document.querySelector(step.selector);
          if (step.exists === false) {
            expect(el).toBeNull();
            break;
          }
          expect(el).not.toBeNull();
          if (step.text !== undefined) {
            expect(el!.textContent).toContain(step.text);
          }
        }
        break;
      }

      case 'assertState': {
        const machine = step.machine ? FSMRegistry.get(step.machine) : primaryMachine();
        if (!machine) throw new Error(`FSM not found for assertState: ${step.machine}`);
        const ctx = machine.getContext();
        const actual = resolvePath(ctx, step.path);
        expect(actual).toEqual(step.equals);
        break;
      }

      case 'fsmState': {
        const machine = step.machine ? FSMRegistry.get(step.machine) : primaryMachine();
        if (!machine) throw new Error(`FSM not found for fsmState: ${step.machine}`);
        const current = machine.getState();
        if (step.equals instanceof RegExp) {
          expect(current).toMatch(step.equals);
        } else if (Array.isArray(step.equals)) {
          expect(step.equals).toContain(current);
        } else {
          expect(current).toBe(step.equals);
        }
        break;
      }

      default:
        throw new Error(`unknown step type ${(step as any).type}`);
    }
  }
}
