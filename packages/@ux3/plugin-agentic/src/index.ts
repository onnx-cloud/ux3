import type { Plugin } from '../../../../src/plugin/registry';
import type { AppContext } from '../../../../src/ui/app';
import { UxPlanTree } from './ux-plan-tree.js';

export interface PlanNodeContext {
  nodeId: string;
  statePath: string[];
  observations: unknown[];
  decisions: string[];
  result: unknown;
  iteration: number;
  error?: Error;
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

class PlanExecutionEngine implements PlanExecutionContext {
  activePlan: Plan | null = null;
  planHistory: Plan[] = [];
  maxHistory: number = 50;
  private observers: PlanObserver[] = [];
  private abortControllers: Map<string, AbortController> = new Map();
  private nodeContexts: Map<string, PlanNodeContext> = new Map();
  private persistence: PlanPersistence;
  private mcpService: any = null;

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
    return plan;
  }

  async *executePlan(planId: string): AsyncIterable<PlanStepResult> {
    const plan = this.getPlan(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    plan.status = 'running';
    this.activePlan = plan;
    const ac = new AbortController();
    this.abortControllers.set(planId, ac);

    try {
      const queue = this.flattenNodes(plan.root.children || []);
      for (const node of queue) {
        if (ac.signal.aborted) break;

        node.status = 'in_progress';
        this.updateNodeContext(planId, node.id, { statePath: ['executing'] });
        this.notifyObservers(plan, node);

        yield { nodeId: node.id, status: 'started' };

        try {
          node.status = 'completed';
          node.completedAt = Date.now();
          this.updateNodeContext(planId, node.id, { statePath: ['done'] });
          this.notifyObservers(plan, node);
          yield { nodeId: node.id, status: 'completed', output: `Completed: ${node.title}` };
        } catch (err: any) {
          node.status = 'failed';
          node.completedAt = Date.now();
          this.updateNodeContext(planId, node.id, { statePath: ['error'], error: err });
          this.notifyObservers(plan, node);
          yield { nodeId: node.id, status: 'failed', error: err.message };
        }
      }

      plan.status = ac.signal.aborted ? 'cancelled' : 'completed';
      plan.completedAt = Date.now();
      this.persistence.save(plan);
    } finally {
      this.abortControllers.delete(planId);
      if (this.activePlan === plan) this.activePlan = null;
    }
  }

  async stepPlan(planId: string, nodeId: string): Promise<PlanStepResult> {
    const plan = this.getPlan(planId);
    if (!plan) throw new Error(`Plan not found: ${planId}`);

    const node = this.findNode(plan.root, nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    node.status = 'in_progress';
    this.updateNodeContext(planId, nodeId, { statePath: ['executing'] });
    this.notifyObservers(plan, node);

    try {
      node.status = 'completed';
      node.completedAt = Date.now();
      this.updateNodeContext(planId, nodeId, { statePath: ['done'] });
      const children = node.children || [];
      const next = children.length > 0 ? children.map((c) => c.id) : this.findNextSiblings(plan.root, nodeId);
      this.notifyObservers(plan, node);
      this.persistence.save(plan);
      return { nodeId, status: 'completed', nextNodes: next };
    } catch (err: any) {
      node.status = 'failed';
      node.completedAt = Date.now();
      this.updateNodeContext(planId, nodeId, { statePath: ['error'], error: err });
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
}

function getEngine(): PlanExecutionEngine | undefined {
  return (window as any).__ux3PlanEngine;
}

export const AgenticPlugin: Plugin = {
  name: '@ux3/plugin-agentic',
  version: '0.1.0',
  description: 'FSM-driven agentic plan execution engine for UX3',

  install(app: AppContext) {
    const mcp = (app as any).services?.mcp;
    const engine = new PlanExecutionEngine(undefined, mcp);
    const planService = new PlanService(mcp, engine);

    (app as any).registerService?.('agentic', () => planService) || ((app as any).services.agentic = planService);
    (app as any).utils.agentic = planService;
    if (typeof window !== 'undefined') {
      (window as any).__ux3PlanEngine = engine;
      (window as any).__ux3PlanService = planService;
    }

    if (!customElements.get('ux-plan-tree')) {
      customElements.define('ux-plan-tree', UxPlanTree);
    }
  },
};

export { PlanExecutionEngine, getEngine };
export default AgenticPlugin;
