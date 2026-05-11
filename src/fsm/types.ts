/**
 * FSM Type Definitions
 */

export type GuardCondition<T extends Record<string, any>> = (context: T) => boolean;

export interface StateEvent {
  type: string;
  payload?: Record<string, any>;
  fromDOM?: boolean;
  sourceElement?: HTMLElement;
}

export interface TransitionConfig<T extends Record<string, any>> {
  target?: string;
  guard?: GuardCondition<T>;
  actions?: Array<ActionFn<T>>;
  payload?: boolean;
  set?: Record<string, unknown>;
  toggle?: string | string[];
  navigate?: string;
  dispatch?: string;
  log?: string;
  sendTo?: string;
  validate?: boolean | string;
}

export type ServiceFn = (params?: any) => Promise<any>;

/**
 * Auto-managed async state fields injected by the FSM during invoke.
 * Available on every FSM context without needing to declare them in YAML.
 */
export interface AsyncStateContext {
  loading?: boolean;
  error?: string | null;
}
export type GuardFn<T extends Record<string, any>> = (context: T) => boolean;
export type ActionFn<T extends Record<string, any>> = (
  context: T,
  event: StateEvent
) => void | Partial<T> | Promise<Partial<T>>;
export type InvokerFn<T extends Record<string, any>, R = any> = (
  ...args: any[]
) => Promise<R>;

export interface InvokeSrc {
  src: string | ServiceFn;
  input?: any;
  maxRetries?: number;
  retryDelay?: number | ((attempt: number) => number);
  map?: Record<string, string>;
  onDone?: string;
  onError?: string;
}

export interface InvokeService {
  service: string;
  method?: string;
  input?: any;
  maxRetries?: number;
  retryDelay?: number | ((attempt: number) => number);
  map?: Record<string, string>;
  onDone?: string;
  onError?: string;
}

export type InvokeConfig<T extends Record<string, any> = Record<string, any>> =
  | InvokeSrc
  | InvokeService;

export function isInvokeService(cfg: InvokeConfig): cfg is InvokeService {
  return typeof (cfg as InvokeService).service === 'string';
}

export function isInvokeSrc(cfg: InvokeConfig): cfg is InvokeSrc {
  return typeof (cfg as InvokeSrc).src !== 'undefined';
}

/**
 * Individual state configuration
 */
export interface StateConfig<T extends Record<string, any>> {
  type?: 'atomic' | 'compound' | 'parallel' | 'final';
  on?: Record<string, TransitionConfig<T> | string>;
  entry?: Array<(context: T) => void | Partial<T> | Promise<Partial<T>>>;
  exit?: Array<(context: T) => void | Partial<T> | Promise<Partial<T>>>;
  invoke?: InvokeConfig<T>;
  errorTarget?: string;
  errorActions?: Array<(context: T, error: Error) => void>;
  initial?: string;
  states?: Record<string, StateConfig<T>>;
  history?: 'shallow' | 'deep';
}

/**
 * Machine (root) configuration
 */
export interface MachineConfig<T extends Record<string, any>> {
  id: string;
  initial: string;
  context?: T | (() => T);
  states: Record<string, StateConfig<T>>;
  parent?: string;
  delegates?: string[];
  strict?: boolean;
  /** Auto-generate a loading state that invokes this source and transitions to `initial` on success */
  entry?: string;
  /** Error target state for the auto-generated entry state (defaults to entry state itself) */
  entryError?: string;
}

export interface MachineContext<T extends Record<string, any>> {
  state: T;
  setState: (updates: Partial<T>) => void;
}
