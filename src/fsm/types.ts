/**
 * FSM Type Definitions
 */

export type GuardCondition<T extends Record<string, any>> = (context: T) => boolean;

export interface StateEvent {
  type: string;
  payload?: Record<string, any>;
}

export interface TransitionConfig<T extends Record<string, any>> {
  target?: string;
  guard?: GuardCondition<T>;
  actions?: Array<(context: T, event: StateEvent) => void>;
}

export type ServiceFn = (params?: any) => Promise<any>;

export interface InvokeSrc {
  src: string | ServiceFn;
  input?: any;
}

export interface InvokeService {
  service: string;
  method?: string;
  input?: any;
}

export interface StateConfig<T extends Record<string, any>> {
  on?: Record<string, TransitionConfig<T> | string>;
  entry?: Array<(context: T) => void>;
  exit?: Array<(context: T) => void>;
  invoke?: InvokeSrc | InvokeService;
}

export interface StateConfig<T extends Record<string, any>> {
  id: string;
  initial: string;
  context?: T | (() => T);
  states: Record<string, StateConfig<T>>;
}

export interface MachineContext<T extends Record<string, any>> {
  state: T;
  setState: (updates: Partial<T>) => void;
}
