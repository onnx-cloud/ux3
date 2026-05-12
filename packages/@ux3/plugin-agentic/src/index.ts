import type { Plugin } from '../../../../src/plugin/registry';
import type { AppContext } from '../../../../src/ui/app';
import type { MachineConfig, StateConfig } from '../../../../src/fsm/types.js';
import { StateMachine } from '../../../../src/fsm/state-machine.js';
import { HandlebarsLite } from '../../../../src/hbs/index.js';
import { UxPlanTree } from './ux-plan-tree.js';
import { resolvePatterns, registerPattern } from './patterns/resolver.js';
import { allPatterns } from './patterns/definitions.js';

export { resolvePatterns } from './patterns/resolver.js';
export { allPatterns } from './patterns/definitions.js';

export interface PlanNodeContext {
  nodeId: string;
  statePath: string[];
  observations: unknown[];
  decisions: string[];
  result: unknown;
  iteration: number;
  error?: Error;
  loading?: boolean;
}

export interface PlanNode {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  children?: PlanNode[];
  observations?: PlanObservation[];
  ctx?: PlanNodeContext;
  metadata?: Record<string, unknown>;
  createdAt: number;
  completedAt?: number;
  pattern?: string;
  invoke?: any;
  on?: Record<string, string>;
}

export interface PlanObservation {
  type: 'info' | 'warning' | 'error' | 'tool_call' | 'tool_result';
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Plan {
  id: string;
  title: string;
  goal: string;
  root: PlanNode;
  status: 'created' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  createdAt: number;
  completedAt?: number;
  context?: Record<string, unknown>;
}

export interface PlanConfig extends MachineConfig<PlanNodeContext> {
  title: string;
  goal: string;
}

export interface PlanExecutionContext {
  activePlan: Plan | null;
  planHistory: Plan[];
  maxHistory: number;
  createPlan(title: string, goal: string, nodes?: Omit<PlanNode, 'id' | 'status' | 'createdAt'>[]): Plan;
  executePlan(planId: string): AsyncIterable<PlanStepResult>;
  stepPlan(planId: string, nodeId: string): Promise<PlanStepResult>;
  cancelPlan(planId: string): void;
  getPlan(planId: string): Plan | undefined;
  listPlans(): Plan[];
  getNodeContext(planId: string, nodeId: string): PlanNodeContext | undefined;
  updateNodeContext(planId: string, nodeId: string, updates: Partial<PlanNodeContext>): void;
  getStatePath(planId: string, nodeId: string): string[];
  observe(fn: (plan: Plan, node: PlanNode) => void): () => void;
}

export interface PlanStepResult {
  nodeId: string;
  status: 'started' | 'completed' | 'failed';
  output?: string;
  error?: string;
  nextNodes?: string[];
}

type PlanObserver = (plan: Plan, node: PlanNode) => void;

function buildMachineConfig(plan: Plan, nodes: PlanNode[], initial?: string): MachineConfig<PlanNodeContext> {
  const states: Record<string, StateConfig<PlanNodeContext>> = {};
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const next = i + 1 < nodes.length ? nodes[i + 1] : undefined;
    const on: Record<string, any> = {};
    if (next) on['SUCCESS'] = next.id;
    else on['SUCCESS'] = `#${plan.root.id}__done`;

    states[node.id] = {
      type: 'atomic',
      on,
      invoke: node.invoke || undefined,
      entry: [(ctx) => {
        ctx.statePath = [node.id];
        ctx.iteration = (ctx.iteration || 0) + 1;
      }],
    };
  }

  states[`${plan.root.id}__done`] = { type: 'final' };

  return {
    id: plan.id,
    initial: initial || (nodes[0]?.id || `${plan.root.id}__done`),
    context: () => ({ nodeId: '', statePath: [], observations: [], decisions: [], result: undefined, iteration: 0 }),
    states,
  };
}

class PlanExecutionEngine implements PlanExecutionContext {
  activePlan: Plan | null = null;
  planHistory: Plan[] = [];
  maxHistory: number = 50;
  private observers: PlanObserver[] = [];
  private abortControllers: Map<string, AbortController> = new Map();
  private nodeContexts: Map<string, PlanNodeContext> = new Map();
  private persistence: PlanPersistence;
  private mcpService: any = null;
  private machines: Map<string, StateMachine<PlanNodeContext>> = new Map();
  private pendingConfigs: Map<string, MachineConfig<PlanNodeContext>> = new Map();

  constructor(persistence?: PlanPersistence, mcpService?: any) {
    this.persistence = persistence || new MemoryPlanPersistence();
    this.mcpService = mcpService || null;
  }

  setMcpService(mcp: any): void {
    this.mcpService = mcp;
  }

  createPlan(
    title: string,
    goal: string,
    nodes?: Omit<PlanNode, 'id' | 'status' | 'createdAt'>[],
  ): Plan {
    const plan: Plan = {
      id: this.genId('plan'),
      title,
      goal,
      root: {
        id: this.genId('node'),
        title: goal,
        status: 'pending',
        children: nodes?.map((n) => {
          const nodeId = this.genId('node');
          const node: PlanNode = {
            ...n,
            id: nodeId,
            status: 'pending',
            children: n.children || [],
            observations: [],
            createdAt: Date.now(),
          };
          this.nodeContexts.set(nodeId, {
            nodeId,
            statePath: [],
            observations: [],
            decisions: [],
            result: undefined,
            iteration: 0,
          });
          return node;
        }),
        observations: [],
        createdAt: Date.now(),
      },
      status: 'created',
      createdAt: Date.now(),
    };

    this.planHistory.push(plan);
    while (this.planHistory.length > this.maxHistory) this.planHistory.shift();
    this.persistence.save(plan);

    const allNodes = this.flattenNodes(plan.root.children || []);
    const machineConfig = buildMachineConfig(plan, allNodes);
    const machine = new StateMachine<PlanNodeContext>(machineConfig, false);
    this.setupMachineInvokeHandlers(machine, plan);

    machine.subscribe((state, ctx) => {
      const node = this.findNode(plan.root, state);
      if (node) {
        node.status = state === `${plan.root.id}__done` ? 'completed' : 'in_progress';
        if (state === `${plan.root.id}__done`) node.completedAt = Date.now();
        node.ctx = { ...ctx, nodeId: state };
        this.nodeContexts.set(state, { ...ctx, nodeId: state });
        this.notifyObservers(plan, node);
      }
      if (state === `${plan.root.id}__done`) {
        plan.status = 'completed';
        plan.completedAt = Date.now();
        this.persistence.save(plan);
      }
    });

    this.machines.set(plan.id, machine);
    return plan;
  }

  createPlanFromConfig(config: PlanConfig): Plan {
    const resolved = resolvePatterns(config);

    const plan: Plan = {
      id: resolved.id || this.genId('plan'),
      title: resolved.title,
      goal: resolved.goal,
      root: {
        id: this.genId('node'),
        title: resolved.goal,
        status: 'pending',
        children: [],
        observations: [],
        createdAt: Date.now(),
      },
      status: 'created',
      createdAt: Date.now(),
    };

    this.planHistory.push(plan);
    while (this.planHistory.length > this.maxHistory) this.planHistory.shift();
    this.persistence.save(plan);
    this.pendingConfigs.set(plan.id, resolved);
    return plan;
  }

  private setupMachineInvokeHandlers(machine: StateMachine<PlanNodeContext>, plan: Plan): void {
    const hbs = new HandlebarsLite();

    machine.registerInvokeHandler('sample', async (input: any, ctx: PlanNodeContext) => {
      const stateCfg = machine.getStateConfig(machine.getState()) as any;
      const prompt = stateCfg?.prompt;
      if (prompt) {
        try {
          const rendered = hbs.render(prompt, {
            ...ctx,
            observations: ctx.observations || [],
            decisions: ctx.decisions || [],
            iteration: ctx.iteration || 0,
            nodeId: ctx.nodeId || '',
          });
          if (this.mcpService && typeof this.mcpService.sendSampleRaw === 'function') {
            const result = await this.mcpService.sendSampleRaw({
              messages: [{ role: 'user', content: rendered }],
              maxTokens: 4096,
            });
            const text = result.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text || '')
              .join('\n');
            ctx.observations = [...(ctx.observations || []), text];
            ctx.result = text;
            ctx.decisions = [...(ctx.decisions || []), text.slice(0, 200)];

            const eventMatch = text.match(/\[EVENT:(\w+)\]/i);
            if (eventMatch) {
              return { __event: eventMatch[1], text };
            }
            return { text };
          }
        } catch {
          ctx.error = new Error('LLM sample call failed');
          return { __event: 'ERROR' };
        }
      }
      return {};
    });

    machine.registerInvokeHandler('executeTool', async (input: any, ctx: PlanNodeContext) => {
      if (this.mcpService) {
        try {
          const toolName = input?.tool || input?.name;
          const toolArgs = input?.args || input?.input || input;
          if (toolName && typeof this.mcpService.executeTool === 'function') {
            const result = await this.mcpService.executeTool(toolName, toolArgs);
            const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
            ctx.observations = [...(ctx.observations || []), resultStr];
            ctx.result = resultStr;
            return { toolResult: resultStr };
          }
        } catch (e) {
          ctx.error = e instanceof Error ? e : new Error(String(e));
          return { __event: 'ERROR' };
        }
      }
      return {};
    });
  }

  async *executePlan(planId: string): AsyncIterable<PlanStepResult> {
    const plan = this.getPlan(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    plan.status = 'running';
    this.activePlan = plan;
    const ac = new AbortController();
    this.abortControllers.set(planId, ac);

    const pendingConfig = this.pendingConfigs.get(planId);

    if (pendingConfig) {
      this.pendingConfigs.delete(planId);
      yield* this.executeFsmPlan(plan, pendingConfig, ac.signal);
    } else {
      yield* this.executeSimplePlan(plan, ac.signal);
    }
  }

  private async *executeFsmPlan(
    plan: Plan,
    config: MachineConfig<PlanNodeContext>,
    signal: AbortSignal,
  ): AsyncIterable<PlanStepResult> {
    const queue: PlanStepResult[] = [];
    let done = false;
    let gate: (() => void) | null = null;

    const machine = new StateMachine<PlanNodeContext>(config, false);
    this.setupMachineInvokeHandlers(machine, plan);

    machine.subscribe((state, ctx) => {
      let node = this.findNode(plan.root, state);
      if (!node) {
        node = {
          id: state,
          title: state,
          status: 'in_progress',
          observations: [],
          ctx: { ...ctx, nodeId: state },
          createdAt: Date.now(),
        };
        if (!plan.root.children) plan.root.children = [];
        plan.root.children.push(node);
      }

      const stateCfg = config.states[state];
      const isFinal = stateCfg?.type === 'final';
      const isError = state === 'error' || ctx.error;

      node.status = isFinal ? 'completed' : isError ? 'failed' : 'in_progress';
      if (isFinal || isError) node.completedAt = Date.now();
      node.ctx = { ...ctx, nodeId: state };
      this.nodeContexts.set(state, { ...ctx, nodeId: state });
      this.notifyObservers(plan, node);

      queue.push({
        nodeId: state,
        status: isError ? 'failed' : isFinal ? 'completed' : 'started',
        output: ctx.result ? String(ctx.result) : undefined,
        error: ctx.error ? (ctx.error instanceof Error ? ctx.error.message : String(ctx.error)) : undefined,
      });

      if (isFinal || isError) done = true;

      if (gate) { const g = gate; gate = null; g(); }
    });

    this.machines.set(plan.id, machine);
    machine.start();

    try {
      while (queue.length > 0) {
        yield queue.shift()!;
      }

      while (!done && !signal.aborted) {
        await new Promise<void>((r) => { gate = r; });
        while (queue.length > 0) {
          yield queue.shift()!;
        }
      }

      plan.status = signal.aborted ? 'cancelled' : 'completed';
      plan.completedAt = Date.now();
      this.persistence.save(plan);
    } finally {
      this.abortControllers.delete(plan.id);
      if (this.activePlan === plan) this.activePlan = null;
    }
  }

  private async *executeSimplePlan(
    plan: Plan,
    signal: AbortSignal,
  ): AsyncIterable<PlanStepResult> {
    const machine = this.machines.get(plan.id);
    if (!machine) throw new Error(`No FSM for plan: ${plan.id}`);

    machine.start();

    try {
      const allNodes = this.flattenNodes(plan.root.children || []);
      for (const node of allNodes) {
        if (signal.aborted) break;

        const currentState = machine.getState();
        if (currentState !== node.id) continue;

        node.status = 'in_progress';
        this.updateNodeContext(plan.id, node.id, { statePath: ['executing'], loading: true });
        this.notifyObservers(plan, node);
        yield { nodeId: node.id, status: 'started' };

        try {
          machine.send({ type: 'SUCCESS' });
          await machine.waitForSettle();

          node.status = 'completed';
          node.completedAt = Date.now();
          const ctx = this.nodeContexts.get(node.id);
          this.updateNodeContext(plan.id, node.id, { statePath: ['done'], loading: false });
          this.notifyObservers(plan, node);
          yield {
            nodeId: node.id,
            status: 'completed',
            output: ctx?.result ? String(ctx.result) : `Completed: ${node.title}`,
          };
        } catch (err: any) {
          node.status = 'failed';
          node.completedAt = Date.now();
          this.updateNodeContext(plan.id, node.id, { statePath: ['error'], error: err, loading: false });
          this.notifyObservers(plan, node);
          yield { nodeId: node.id, status: 'failed', error: err.message };
        }
      }

      plan.status = signal.aborted ? 'cancelled' : 'completed';
      plan.completedAt = Date.now();
      this.persistence.save(plan);
    } finally {
      this.abortControllers.delete(plan.id);
      if (this.activePlan === plan) this.activePlan = null;
    }
  }

  async stepPlan(planId: string, nodeId: string): Promise<PlanStepResult> {
    const plan = this.getPlan(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    const machine = this.machines.get(planId);

    const node = this.findNode(plan.root, nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    node.status = 'in_progress';
    this.updateNodeContext(planId, nodeId, { statePath: ['executing'], loading: true });
    this.notifyObservers(plan, node);

    try {
      if (machine && machine.getState() === nodeId) {
        machine.send({ type: 'SUCCESS' });
        await machine.waitForSettle();
      }

      node.status = 'completed';
      node.completedAt = Date.now();
      const ctx = this.nodeContexts.get(nodeId);
      this.updateNodeContext(planId, nodeId, { statePath: ['done'], loading: false });
      const children = node.children || [];
      const next = children.length > 0 ? children.map((c) => c.id) : this.findNextSiblings(plan.root, nodeId);
      this.notifyObservers(plan, node);
      this.persistence.save(plan);
      return {
        nodeId,
        status: 'completed',
        nextNodes: next,
        output: ctx?.result ? String(ctx.result) : undefined,
      };
    } catch (err: any) {
      node.status = 'failed';
      node.completedAt = Date.now();
      this.updateNodeContext(planId, nodeId, { statePath: ['error'], error: err, loading: false });
      this.notifyObservers(plan, node);
      return { nodeId, status: 'failed', error: err.message };
    }
  }

  cancelPlan(planId: string): void {
    const ac = this.abortControllers.get(planId);
    if (ac) ac.abort();
    const plan = this.getPlan(planId);
    if (plan) {
      plan.status = 'cancelled';
      plan.completedAt = Date.now();
    }
  }

  getPlan(planId: string): Plan | undefined {
    return this.planHistory.find((p) => p.id === planId);
  }

  listPlans(): Plan[] {
    return [...this.planHistory];
  }

  getNodeContext(planId: string, nodeId: string): PlanNodeContext | undefined {
    return this.nodeContexts.get(nodeId);
  }

  updateNodeContext(planId: string, nodeId: string, updates: Partial<PlanNodeContext>): void {
    const existing = this.nodeContexts.get(nodeId);
    if (existing) {
      Object.assign(existing, updates);
    } else {
      const ctx: PlanNodeContext = {
        nodeId,
        statePath: [],
        observations: [],
        decisions: [],
        result: undefined,
        iteration: 0,
        ...updates,
      };
      this.nodeContexts.set(nodeId, ctx);
    }
  }

  getStatePath(planId: string, nodeId: string): string[] {
    const ctx = this.nodeContexts.get(nodeId);
    return ctx?.statePath || [];
  }

  observe(fn: PlanObserver): () => void {
    this.observers.push(fn);
    return () => {
      const idx = this.observers.indexOf(fn);
      if (idx !== -1) this.observers.splice(idx, 1);
    };
  }

  addObservation(planId: string, nodeId: string, obs: PlanObservation): void {
    const plan = this.getPlan(planId);
    if (!plan) return;
    const node = this.findNode(plan.root, nodeId);
    if (!node) return;
    if (!node.observations) node.observations = [];
    node.observations.push(obs);
    this.notifyObservers(plan, node);
  }

  private notifyObservers(plan: Plan, node: PlanNode): void {
    for (const fn of this.observers) {
      try { fn(plan, node); } catch {}
    }
  }

  private flattenNodes(nodes: PlanNode[]): PlanNode[] {
    const result: PlanNode[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.children?.length) result.push(...this.flattenNodes(node.children));
    }
    return result;
  }

  private findNode(node: PlanNode, id: string): PlanNode | null {
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNode(child, id);
        if (found) return found;
      }
    }
    return null;
  }

  private findNextSiblings(root: PlanNode, nodeId: string): string[] {
    const all = this.flattenNodes(root.children || []);
    const idx = all.findIndex((n) => n.id === nodeId);
    if (idx === -1 || idx >= all.length - 1) return [];
    return [all[idx + 1].id];
  }

  private genId(prefix: string): string {
    const r = () => Math.random().toString(36).slice(2, 8);
    return `${prefix}-${Date.now().toString(36)}-${r()}`;
  }
}

interface PlanPersistence {
  save(plan: Plan): void;
  load(id: string): Plan | null;
  list(): string[];
}

class MemoryPlanPersistence implements PlanPersistence {
  private store: Map<string, Plan> = new Map();

  save(plan: Plan): void { this.store.set(plan.id, plan); }
  load(id: string): Plan | null { return this.store.get(id) || null; }
  list(): string[] { return [...this.store.keys()]; }
}

export class PlanService {
  private engine: PlanExecutionEngine;
  private mcp: any;

  constructor(mcp: any, engine?: PlanExecutionEngine) {
    this.mcp = mcp;
    this.engine = engine || new PlanExecutionEngine(undefined, mcp);
    this.engine.setMcpService(mcp);
  }

  get engine_(): PlanExecutionEngine {
    return this.engine;
  }

  getPlanExecutionContext(): PlanExecutionContext {
    return this.engine;
  }

  createPlan(title: string, goal: string, steps: string[]): Plan {
    const nodes = steps.map((step) => ({
      title: step,
      description: '',
      observations: [],
      metadata: {},
      createdAt: Date.now(),
    }));
    return this.engine.createPlan(title, goal, nodes);
  }

  async *executePlan(planId: string): AsyncIterable<PlanStepResult> {
    yield* this.engine.executePlan(planId);
  }

  async stepPlan(planId: string, nodeId: string): Promise<PlanStepResult> {
    return this.engine.stepPlan(planId, nodeId);
  }

  cancelPlan(planId: string): void {
    this.engine.cancelPlan(planId);
  }

  getPlan(planId: string): Plan | undefined {
    return this.engine.getPlan(planId);
  }

  listPlans(): Plan[] {
    return this.engine.listPlans();
  }

  getPlanState(planId: string): { plan: Plan; nodeContexts: Record<string, PlanNodeContext> } | undefined {
    const plan = this.engine.getPlan(planId);
    if (!plan) return undefined;
    const nodeContexts: Record<string, PlanNodeContext> = {};
    const allNodes = this.engine['flattenNodes']?.(plan.root.children || []) || [];
    for (const node of allNodes) {
      const ctx = this.engine.getNodeContext(planId, node.id);
      if (ctx) nodeContexts[node.id] = ctx;
    }
    return { plan, nodeContexts };
  }

  updateNode(planId: string, nodeId: string, updates: {
    observations?: unknown[];
    decisions?: string[];
    result?: unknown;
    statePath?: string[];
  }): { nodeId: string; updated: boolean } {
    this.engine.updateNodeContext(planId, nodeId, updates as Partial<PlanNodeContext>);
    return { nodeId, updated: true };
  }
}

function getEngine(): PlanExecutionEngine | undefined {
  return (window as any).__ux3PlanEngine;
}

const pkgJson = require('../package.json');

export const AgenticPlugin: Plugin = {
  name: '@ux3/plugin-agentic',
  version: '0.2.0',
  description: 'FSM-driven agentic plan execution engine for UX3',

  install(app: AppContext) {
    for (const pattern of allPatterns) {
      registerPattern(pattern);
    }

    const mcp = (app as any).services?.mcp;
    const engine = new PlanExecutionEngine(undefined, mcp);
    const planService = new PlanService(mcp, engine);

    (app as any).registerService?.('agentic', () => planService) || ((app as any).services.agentic = planService);
    (app as any).utils.agentic = planService;
    if (typeof window !== 'undefined') {
      (window as any).__ux3PlanEngine = engine;
      (window as any).__ux3PlanService = planService;
    }

    if (mcp && typeof mcp.registerToolHandler === 'function') {
      mcp.registerToolHandler('agentic:createPlan', async (args: Record<string, unknown>) => {
        if (args.config) {
          const plan = engine.createPlanFromConfig(args.config as PlanConfig);
          return { id: plan.id, title: plan.title, goal: plan.goal, status: plan.status };
        }
        const title = (args.title as string) || 'Untitled Plan';
        const goal = (args.goal as string) || '';
        const steps = (args.steps as string[]) || [];
        const plan = planService.createPlan(title, goal, steps);
        return { id: plan.id, title: plan.title, goal: plan.goal, status: plan.status };
      });

      mcp.registerToolHandler('agentic:executePlan', async (args: Record<string, unknown>) => {
        const planId = (args.planId as string) || '';
        const results: PlanStepResult[] = [];
        for await (const step of planService.executePlan(planId)) {
          results.push(step);
        }
        return { planId, status: 'completed', results };
      });

      mcp.registerToolHandler('agentic:stepPlan', async (args: Record<string, unknown>) => {
        const planId = (args.planId as string) || '';
        const nodeId = (args.nodeId as string) || '';
        return planService.stepPlan(planId, nodeId);
      });

      mcp.registerToolHandler('agentic:getPlanState', async (args: Record<string, unknown>) => {
        const planId = (args.planId as string) || '';
        return planService.getPlanState(planId);
      });

      mcp.registerToolHandler('agentic:cancelPlan', async (args: Record<string, unknown>) => {
        const planId = (args.planId as string) || '';
        planService.cancelPlan(planId);
        return { planId, cancelled: true };
      });

      mcp.registerToolHandler('agentic:updateNode', async (args: Record<string, unknown>) => {
        const planId = (args.planId as string) || '';
        const nodeId = (args.nodeId as string) || '';
        const updates: any = {};
        if (args.observations) updates.observations = args.observations;
        if (args.decisions) updates.decisions = args.decisions;
        if (args.result !== undefined) updates.result = args.result;
        if (args.statePath) updates.statePath = args.statePath;
        return planService.updateNode(planId, nodeId, updates);
      });
    }

    if (!customElements.get('ux-plan-tree')) {
      customElements.define('ux-plan-tree', UxPlanTree);
    }
  },
};

export { PlanExecutionEngine, getEngine };
export default AgenticPlugin;
