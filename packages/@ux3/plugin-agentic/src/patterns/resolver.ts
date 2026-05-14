import type { MachineConfig, StateConfig } from '../../../../../src/fsm/types.js';
import type { PlanNodeContext, PlanConfig } from '../index.js';

export interface PatternDef {
  id: string;
  description?: string;
  initial: string;
  states: Record<string, PatternStateDef>;
}

export interface PatternStateDef {
  type?: 'atomic' | 'compound' | 'parallel' | 'final';
  template?: string;
  prompt?: string; // deprecated alias for inline prompt text
  context?: Record<string, unknown>;
  invoke?: {
    src: string;
    maxRetries?: number;
    retryDelay?: number;
  };
  on?: Record<string, string>;
}

const patternCache = new Map<string, PatternDef>();

let yamlParser: ((text: string) => any) | null = null;

function setYamlParser(parser: (text: string) => any): void {
  yamlParser = parser;
}

function parseYaml(text: string): any {
  if (yamlParser) return yamlParser(text);
  return parseSimpleYaml(text);
}

function parseSimpleYaml(text: string): any {
  const lines = text.split('\n');
  const root: any = {};
  const stack: Array<{ obj: any; key: string; indent: number }> = [{ obj: root, key: '', indent: -1 }];

  function getIndent(line: string): number {
    const m = line.match(/^(\s*)/);
    return m ? m[1].length : 0;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indent = getIndent(line);

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    const trimmed = line.trim();

    if (trimmed.includes(':')) {
      const colonIdx = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();

      if (key === 'prompt') {
        const blockLines: string[] = [];
        i++;
        while (i < lines.length && (lines[i].trim() === '' || getIndent(lines[i]) > indent)) {
          if (lines[i].trim() === '') { i++; continue; }
          blockLines.push(lines[i].replace(new RegExp(`^\\s{${indent + 2}}`), ''));
          i++;
        }
        i--;
        parent.obj[key] = blockLines.join('\n');
      } else if (value === '|') {
        const blockLines: string[] = [];
        i++;
        while (i < lines.length && (lines[i].trim() === '' || getIndent(lines[i]) > indent)) {
          if (lines[i].trim() === '') { i++; continue; }
          blockLines.push(lines[i].replace(new RegExp(`^\\s{${indent + 2}}`), ''));
          i++;
        }
        i--;
        parent.obj[key] = blockLines.join('\n');
      } else if (value === '') {
        const obj: any = {};
        parent.obj[key] = obj;
        stack.push({ obj, key, indent });
      } else {
        if (value === 'true' || value === 'false') {
          parent.obj[key] = value === 'true';
        } else if (/^-?\d+(\.\d+)?$/.test(value)) {
          parent.obj[key] = Number(value);
        } else {
          parent.obj[key] = value;
        }
      }
    } else if (trimmed.startsWith('- ')) {
      const item = trimmed.slice(2).trim();
      if (!Array.isArray(parent.obj)) {
        parent.obj = [];
      }
      const obj: any = { _item: item };
      parent.obj.push(obj);
      stack.push({ obj, key: String(parent.obj.length - 1), indent });
    }
  }

  return root;
}

export function registerPattern(patternDef: PatternDef): void {
  patternCache.set(patternDef.id, patternDef);
}

export function registerPatternFromYaml(yamlText: string): void {
  const def = parseYaml(yamlText);
  registerPattern(def as PatternDef);
}

function resolvePattern(patternName: string): PatternDef | undefined {
  return patternCache.get(patternName);
}

export function resolvePatterns(
  config: PlanConfig,
): MachineConfig<PlanNodeContext> {
  const resolvedStates: Record<string, StateConfig<PlanNodeContext>> = {};

  for (const [stateName, stateDef] of Object.entries(config.states)) {
    const extState = stateDef as StateConfig<PlanNodeContext> & { pattern?: string; invoke?: any; on?: Record<string, string>; prompt?: string; template?: string; context?: Record<string, unknown> };

    if (extState.pattern) {
      const pattern = resolvePattern(extState.pattern);
      if (!pattern) {
        resolvedStates[stateName] = {
          type: 'atomic',
          on: extState.on as Record<string, any>,
          invoke: extState.invoke,
        };
        continue;
      }

      const compoundStates: Record<string, StateConfig<PlanNodeContext>> = {};
      for (const [pStateName, pStateDef] of Object.entries(pattern.states)) {
        const on: Record<string, any> = {};

        if (pStateDef.on) {
          for (const [event, target] of Object.entries(pStateDef.on)) {
            if (target === '#error') {
              on[event] = '.error';
              on['ERROR'] = '.error';
            } else if (event === 'done') {
              on['SUCCESS'] = `.${target}`;
              on['done'] = `.${target}`;
            } else if (event === 'error') {
              on['ERROR'] = `.${target}`;
            } else if (pStateDef.type === 'final' || !pattern.states[target]) {
              on[event] = target;
              on['SUCCESS'] = target;
            } else {
              on[event] = `.${target}`;
              on['SUCCESS'] = `.${target}`;
            }
          }
        }

        if (!on['SUCCESS'] && pStateDef.type !== 'final') {
          const nextStates = Object.keys(pattern.states);
          const idx = nextStates.indexOf(pStateName);
          if (idx < nextStates.length - 1) {
            const nextState = nextStates[idx + 1];
            on['SUCCESS'] = `.${nextState}`;
          }
        }

        compoundStates[pStateName] = {
          type: pStateDef.type || 'atomic',
          on,
          invoke: pStateDef.invoke as any,
          template: pStateDef.template,
          prompt: pStateDef.prompt,
          context: pStateDef.context,
        } as StateConfig<PlanNodeContext>;
      }

      const hasErrorTarget = Object.values(compoundStates).some(
        (s) => s.on && (Object.values(s.on as any).includes('.error'))
      );
      if (hasErrorTarget) {
        compoundStates['error'] = { type: 'final' } as StateConfig<PlanNodeContext>;
      }

      const parentOn: Record<string, any> = {};
      if (extState.on) {
        for (const [event, target] of Object.entries(extState.on)) {
          parentOn[event] = target;
        }
      }

      resolvedStates[stateName] = {
        type: 'compound',
        initial: pattern.initial,
        states: compoundStates,
        on: parentOn,
      } as StateConfig<PlanNodeContext>;
    } else {
      resolvedStates[stateName] = extState;
    }
  }

  return {
    ...config,
    states: resolvedStates,
  };
}

export { setYamlParser };
