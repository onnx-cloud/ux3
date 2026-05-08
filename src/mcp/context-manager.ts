/**
 * MCP Context Manager
 *
 * Tracks dev session state, FSM snapshots, compile artifacts, and project metadata.
 * Provides LLM clients with contextual awareness of the running application.
 */

import type { AppContext } from '../ui/app.js';

export interface DevSessionState {
  /** Whether the dev server is running */
  devServerRunning: boolean;
  /** Port the dev server is on */
  devPort?: number;
  /** Whether hot reload is active */
  hotReload: boolean;
  /** Whether MCP is enabled */
  mcpEnabled: boolean;
  /** Last build timestamp */
  lastBuild?: number;
  /** Active locale */
  locale?: string;
  /** Current route */
  route?: string;
}

export interface FSMSnapshot {
  widgetId: string;
  state: string;
  context: Record<string, unknown>;
  eventCount: number;
  timestamp: number;
}

export interface MCPContext {
  /** Project root directory */
  projectDir: string;
  /** Dev session state (null when dev server is not running) */
  devSession: DevSessionState | null;
  /** Live FSM snapshots keyed by widget ID */
  fsmSnapshots: Map<string, FSMSnapshot>;
  /** The UX3 app context (available when running in browser) */
  appContext: AppContext | null;
  /** Tool invocation history for trace/debug */
  invocationHistory: Array<{ tool: string; args: unknown; result: unknown; ts: number }>;
  /** Maximum invocation history entries to keep */
  maxHistory: number;
}

export function createMCPContext(projectDir: string, options?: Partial<Pick<MCPContext, 'maxHistory'>>): MCPContext {
  return {
    projectDir,
    devSession: null,
    fsmSnapshots: new Map(),
    appContext: null,
    invocationHistory: [],
    maxHistory: options?.maxHistory ?? 500,
  };
}

export function setDevSession(ctx: MCPContext, session: Partial<DevSessionState> | null): void {
  if (session === null) {
    ctx.devSession = null;
    return;
  }
  ctx.devSession = {
    devServerRunning: session.devServerRunning ?? false,
    devPort: session.devPort,
    hotReload: session.hotReload ?? false,
    mcpEnabled: session.mcpEnabled ?? false,
    lastBuild: session.lastBuild,
    locale: session.locale,
    route: session.route,
  };
}

export function recordFSMSnapshot(ctx: MCPContext, snapshot: FSMSnapshot): void {
  ctx.fsmSnapshots.set(snapshot.widgetId, snapshot);
}

export function recordInvocation(ctx: MCPContext, tool: string, args: unknown, result: unknown): void {
  ctx.invocationHistory.push({
    tool,
    args,
    result,
    ts: Date.now(),
  });
  while (ctx.invocationHistory.length > ctx.maxHistory) {
    ctx.invocationHistory.shift();
  }
}

export function setAppContext(ctx: MCPContext, appContext: AppContext | null): void {
  ctx.appContext = appContext;
}

export function getAllFSMSnapshots(ctx: MCPContext): FSMSnapshot[] {
  return [...ctx.fsmSnapshots.values()];
}

export function getFSMSnapshot(ctx: MCPContext, widgetId: string): FSMSnapshot | null {
  return ctx.fsmSnapshots.get(widgetId) ?? null;
}
