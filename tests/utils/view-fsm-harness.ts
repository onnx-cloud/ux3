/**
 * Generic harness for testing UX3 view YAML configs.
 *
 * Works with any UX3 example project — callers supply the project's `ux/` root
 * directory and the harness handles loading, parsing, template resolution, and
 * stateless FSM construction.
 *
 * Design notes:
 * - `template` and `invoke` fields are stripped before building a StateMachine so
 *   tests drive transitions manually via `send()` without needing real services.
 * - Template paths are resolved relative to the project `ux/` directory, mirroring
 *   how the UX3 runtime locates templates at render-time.
 */

import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import { StateMachine } from '../../src/fsm/state-machine.ts';
import type { MachineConfig } from '../../src/fsm/types.ts';

// ---------------------------------------------------------------------------
// Types matching the YAML view schema
// ---------------------------------------------------------------------------

export interface ViewStateRaw {
  template?: string;
  invoke?: unknown;
  on?: Record<string, string | { target?: string; guard?: unknown; actions?: unknown[] }>;
  entry?: unknown[];
  exit?: unknown[];
  errorTarget?: string;
}

export interface ViewConfigRaw {
  name?: string;
  description?: string;
  initial: string;
  context?: Record<string, unknown>;
  states: Record<string, ViewStateRaw>;
}

export interface LoadedView {
  /** Path relative to the viewDir passed to loadAllViewYamls. */
  relPath: string;
  /** Absolute path to the YAML file. */
  absPath: string;
  config: ViewConfigRaw;
}

export interface Transition {
  from: string;
  event: string;
  to: string;
}

// ---------------------------------------------------------------------------
// Loading helpers
// ---------------------------------------------------------------------------

/** Parse a single YAML view config from disk. */
export function loadViewYaml(filePath: string): ViewConfigRaw {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return parseYaml(raw) as ViewConfigRaw;
}

/**
 * Recursively find and parse all `*.yaml` files under `viewDir`.
 * Returns the parsed config for each together with its paths.
 */
export function loadAllViewYamls(viewDir: string): LoadedView[] {
  const results: LoadedView[] = [];

  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
      } else if (entry.isFile() && entry.name.endsWith('.yaml')) {
        results.push({
          relPath: path.relative(viewDir, abs),
          absPath: abs,
          config: loadViewYaml(abs),
        });
      }
    }
  }

  walk(viewDir);
  return results.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

// ---------------------------------------------------------------------------
// StateMachine construction
// ---------------------------------------------------------------------------

/**
 * Build a StateMachine from a raw view config.
 *
 * `template` and `invoke` entries are stripped so tests can drive transitions
 * manually without registering real service handlers.
 * The `initial` state may be overridden to isolate individual transitions.
 */
export function buildStateMachine(
  raw: ViewConfigRaw,
  overrideInitial?: string,
): StateMachine<Record<string, unknown>> {
  const states: MachineConfig<Record<string, unknown>>['states'] = {};

  for (const [stateName, stateRaw] of Object.entries(raw.states)) {
    const { on, entry, exit, errorTarget } = stateRaw;
    const smState: Record<string, unknown> = {};
    if (on) smState.on = on;
    if (entry) smState.entry = entry;
    if (exit) smState.exit = exit;
    if (errorTarget) smState.errorTarget = errorTarget;
    states[stateName] = smState as MachineConfig<Record<string, unknown>>['states'][string];
  }

  const machineConfig: MachineConfig<Record<string, unknown>> = {
    id: raw.name ?? 'test',
    initial: overrideInitial ?? raw.initial,
    context: raw.context ? { ...raw.context } : undefined,
    states,
  };

  return new StateMachine(machineConfig);
}

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a template reference (e.g. `'view/home/index.html'`) to an absolute
 * path under the project `ux/` directory.
 */
export function resolveTemplatePath(uxDir: string, templateRef: string): string {
  return path.join(uxDir, templateRef);
}

/**
 * Build a map of `stateName → absolute template path` for every state in the
 * config that declares a `template`.
 */
export function getStateTemplates(
  uxDir: string,
  raw: ViewConfigRaw,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [stateName, stateRaw] of Object.entries(raw.states)) {
    if (stateRaw.template) {
      map.set(stateName, resolveTemplatePath(uxDir, stateRaw.template));
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Transition helpers
// ---------------------------------------------------------------------------

/**
 * Extract all declared transitions from a view config as `(from, event, to)` triples.
 * Handles both string shorthand (`SUCCESS: ready`) and object form
 * (`SUCCESS: { target: ready }`).
 */
export function getTransitions(raw: ViewConfigRaw): Transition[] {
  const transitions: Transition[] = [];

  for (const [stateName, stateRaw] of Object.entries(raw.states)) {
    if (!stateRaw.on) continue;
    for (const [eventName, target] of Object.entries(stateRaw.on)) {
      const to = typeof target === 'string' ? target : (target as { target?: string })?.target;
      if (to) {
        transitions.push({ from: stateName, event: eventName, to });
      }
    }
  }

  return transitions;
}

/**
 * Compute the set of all states reachable from `initial` by walking the
 * transition graph declared in the config.
 */
export function getReachableStates(raw: ViewConfigRaw): Set<string> {
  const transitions = getTransitions(raw);
  const reachable = new Set<string>([raw.initial]);
  const queue = [raw.initial];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const t of transitions) {
      if (t.from === current && !reachable.has(t.to)) {
        reachable.add(t.to);
        queue.push(t.to);
      }
    }
  }

  return reachable;
}
