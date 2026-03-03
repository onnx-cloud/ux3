/**
 * @ux3/test-harness
 * Comprehensive testing utilities for UX3 Framework
 *
 * Includes:
 * - FSM testing (TestFSMBuilder, FSMTestFixture, state/event tracking)
 * - Service testing (mock services, call recording, error simulation)
 * - View testing (mock AppContext, ShadowDOM simulation)
 */

// FSM testing exports
export {
  TestFSMBuilder,
  createSimpleTestFSM,
  assertFSMState,
  assertFSMCanTransition,
  FSMStateTracker,
  FSMEventTracker,
  FSMTestFixture,
} from './fsm.js';

// Service testing exports
export {
  MockHttpService,
  MockJSONRPCService,
  ServiceCallRecorder,
  ServiceErrorSimulator,
  ServiceSpy,
} from './services.js';

// View testing exports
export {
  MockAppContext,
  MockShadowDOM,
  ViewTestFixture,
  StateRenderingHelper,
} from './views.js';

// Version
export const VERSION = '1.0.0';

/**
 * All-in-one test setup helper
 */
export function createComprehensiveTestEnvironment() {
  const appContext = new (require('./views.js')).MockAppContext();
  const viewFixture = new (require('./views.js')).ViewTestFixture(appContext);
  const fsm = new (require('./fsm.js')).TestFSMBuilder().build();
  const fsmFixture = new (require('./fsm.js')).FSMTestFixture(fsm);

  return {
    appContext,
    viewFixture,
    fsm,
    fsmFixture,
    services: {
      mockHttp: new (require('./services.js')).MockHttpService(),
      mockJsonRpc: new (require('./services.js')).MockJSONRPCService(),
      recorder: new (require('./services.js')).ServiceCallRecorder(),
      errorSim: new (require('./services.js')).ServiceErrorSimulator(),
      spy: new (require('./services.js')).ServiceSpy(),
    },
  };
}
