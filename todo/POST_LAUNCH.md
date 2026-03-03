# UX3 Post-Launch Roadmap

**v1.0 Status**: ✅ Production ready, launched March 3, 2026

This document outlines the post-launch roadmap for UX3, organized by priority and timeline. All items reference REVIEW2.md for detailed analysis.

---

## Phase 1: v1.1 (Weeks 1-3 Post-Launch)

**Focus**: Service resilience and testing infrastructure

### 1.1.1 Service Lifecycle Integration (~8 hours)

**Current State**: Type system prepared, runtime not implemented (70% complete)

**What Needs Doing**:

1. **Implement auto-retry in StateMachine**
   - Read `maxRetries` and `retryDelay` from invoke config
   - File: `src/fsm/state-machine.ts`
   - Add retry loop in invoke handler
   - Exponential backoff: `delay = baseDelay * Math.pow(2, attempt)`
   - Example in docs exists at `docs/patterns/data-fetching.md`

2. **Hook service lifecycle phases**
   - Emit hooks: REGISTER, CONNECT, AUTHENTICATE, READY
   - File: `src/core/app-context.ts`
   - Allow plugins to intercept lifecycle

3. **Add request/response middleware logging**
   - Integrate with `@ux3/logger`
   - File: `src/services/base.ts` (new)
   - Structured logging for all service calls

**Definition of Done**:
- [ ] `maxRetries` and `retryDelay` evaluated by StateMachine
- [ ] Service lifecycle hooks emitted and tested
- [ ] Middleware logging integrated
- [ ] E2E test: retry flow with backoff
- [ ] Documentation updated with examples

**Related Files**:
- `src/fsm/state-machine.ts` — Invoke handler
- `src/core/app-context.ts` — Lifecycle hooks
- `src/services/` — Service middleware

---

### 1.1.2 Error Recovery Runtime (~6 hours)

**Current State**: Config prepared, runtime unused (50% complete)

**What Needs Doing**:

1. **Implement errorTarget transitions**
   - When service invoke succeeds: fire SUCCESS event
   - When service invoke fails: check `errorTarget` property
   - If `errorTarget` exists, transition to error state
   - File: `src/fsm/state-machine.ts`

2. **Execute errorActions before transition**
   - Run actions array before moving to error state
   - Pass error details to actions
   - File: `src/fsm/state-machine.ts`

3. **Pass error context to error state**
   - Make error details available in error state's context
   - Example: `ctx.error = { code, message, statusCode, details }`
   - File: `src/fsm/state-machine.ts`

**Definition of Done**:
- [ ] `errorTarget` transitions work automatically
- [ ] `errorActions` execute before transition
- [ ] Error context passed and accessible
- [ ] E2E test: error flow from HTTP failure to error state
- [ ] Documentation updated with examples

**Related Files**:
- `src/fsm/state-machine.ts` — Invoke and transition logic
- `tests/fsm/` — Error flow tests

**Example Usage** (desired pattern):
```yaml
states:
  loading:
    invoke:
      src: user.getUser
      params: [ctx.userId]
      errorTarget: error              # Auto-transition on error
      errorActions: [logError, track]  # Auto-execute on error
    on:
      SUCCESS: { target: loaded }
      # ERROR handling is automatic now

  error:
    on:
      RETRY: loading
      DISMISS: idle
```

---

### 1.1.3 Testing Harness Package (~10 hours)

**Current State**: Tests exist scattered, no package (75% complete)

**What Needs Doing**:

1. **Create `@ux3/test-harness` package**
   - Directory: `packages/@ux3/test-harness/`
   - Publish to npm as part of monorepo
   - File: `packages/@ux3/test-harness/src/index.ts`

2. **Add FSM test fixtures**
   - `createTestFSM(config)` — Factory with mocked services
   - `assertTransition(fsm, event, expectedState)` — Assert state changes
   - `assertContextAfter(fsm, event, contextChanges)` — Assert context updates
   - File: `packages/@ux3/test-harness/src/fsm.ts`

3. **Add service mocks**
   - `mockHTTP(baseURL)` — Mock fetch with predefined responses
   - `mockJSONRPC(methods)` — Mock JSON-RPC services
   - File: `packages/@ux3/test-harness/src/services.ts`

4. **Add view fixtures**
   - `setupView(config)` — Create view for testing
   - `assertRendered(view, selector)` — Assert element exists
   - `assertText(view, selector, text)` — Assert text content
   - File: `packages/@ux3/test-harness/src/views.ts`

5. **Fix test import issues**
   - Vitest `tsconfig.json` path resolution
   - Ensure all tests use `@ux3/*` aliases
   - File: `vitest.config.ts`

**Definition of Done**:
- [ ] Package published to npm
- [ ] All FSM test helpers working
- [ ] All service mock helpers working
- [ ] All view test helpers working
- [ ] IAM example tests refactored to use harness
- [ ] Documentation at `docs/guides/testing.md` updated with harness examples
- [ ] 100% test pass rate

**Export Structure**:
```typescript
// packages/@ux3/test-harness/src/index.ts
export { createTestFSM, assertTransition, assertContextAfter } from './fsm';
export { mockHTTP, mockJSONRPC } from './services';
export { setupView, assertRendered, assertText } from './views';
```

---

### 1.1.4 Error Handling Documentation

**Current State**: No guide (0% complete)

**What Needs Doing**:

File: `docs/patterns/error-handling.md` ✅ **DONE** (created in v1.0)

**Verification**:
- [ ] Document references service lifecycle
- [ ] Document references errorTarget config
- [ ] Code examples updated for v1.1 features

---

### 1.1 Success Criteria

```
- [ ] 98%+ test pass rate
- [ ] Service lifecycle demo works
- [ ] Error recovery demo works
- [ ] Test harness package published
- [ ] All v1.1 documentation complete
- [ ] Zero breaking changes to v1.0 apps
```

**Timeline**: 2-3 weeks post-launch

---

## Phase 2: v1.2 (Weeks 4-6 Post-Launch)

**Focus**: Advanced routing and performance observability

### 1.2.1 Routing Enhancements (~8 hours)

**Current State**: Basic routing works, advanced features missing (70% complete)

**What Needs Doing**:

1. **Add route guards**
   - Check auth before navigation: `guard: (user) => user.isAuthenticated`
   - File: `src/services/router.ts`
   - Example: protect `/admin` routes

2. **Add async route loaders**
   - Fetch data before mounting view: `loader: async (params) => fetchData(params.id)`
   - File: `src/services/router.ts`
   - Keep loading UI until data arrives

3. **Add scroll restoration**
   - Remember scroll position on back/forward
   - File: `src/services/router.ts`
   - Use `window.scrollY | sessionStorage`

4. **Add lazy loading support**
   - Code-split views by route
   - File: `src/services/router.ts`
   - Dynamic imports for view components

**Definition of Done**:
- [ ] Route guards block unauthorized navigation
- [ ] Async loaders fetch data before view mount
- [ ] Scroll position restored on history navigation
- [ ] Lazy-loaded routes load on-demand
- [ ] E2E tests for all features
- [ ] Documentation at `docs/routing.md` updated

**Example Usage**:
```yaml
routes:
  - path: /admin
    view: admin
    guard: (ctx) => ctx.user?.isAdmin  # Block non-admins

  - path: /market/:exchange
    view: market
    loader: (params) => fetchExchangeData(params.exchange)  # Load before mount
    lazy: true  # Code-split this route
```

---

### 1.2.2 Performance Observability (~12 hours)

**Current State**: Bundle size only, no operational metrics (25% complete)

**What Needs Doing**:

1. **Core Web Vitals tracking**
   - Measure LCP (Largest Contentful Paint)
   - Measure INP (Interaction to Next Paint)
   - Measure CLS (Cumulative Layout Shift)
   - File: `src/plugins/performance-metrics.ts` (new)

2. **Request waterfall visualization**
   - Log all service calls with timing
   - Group by FSM state
   - File: `src/plugins/request-logger.ts` (new)

3. **FSM transition timing**
   - Measure time in each state
   - Identify slow state changes
   - File: `src/fsm/state-machine.ts` (add timing)

4. **Memory profiling helpers**
   - Detect common memory leak patterns
   - File: `src/plugins/memory-monitor.ts` (new)

**Definition of Done**:
- [ ] Web Vitals collected and sent to backend
- [ ] Request waterfall logged with timings
- [ ] FSM state timing measured
- [ ] Memory monitor integrated
- [ ] Dashboard/reporting tool created
- [ ] Documentation at `docs/guides/performance.md` created

---

### 1.2.3 CLI Enhancements (~8 hours)

**Current State**: Core commands present, utilities missing (80% complete)

**What Needs Doing**:

1. **Add `ux3 lint` command**
   - YAML validation beyond schema
   - Detect unused i18n keys
   - Detect dead code (unreachable states)
   - File: `src/cli/commands/lint.ts` (new)

2. **Add `ux3 scaffold` commands**
   - `ux3 scaffold view newViewName` — Boilerplate view + FSM + styles
   - `ux3 scaffold service newServiceName` — Service template
   - File: `src/cli/commands/scaffold.ts` (new)

3. **Add `ux3 bundle analyze` command**
   - Show bundle composition (what's taking space)
   - Show code split breakdown
   - File: `src/cli/commands/bundle.ts` (new)

**Definition of Done**:
- [ ] `ux3 lint` catches common mistakes
- [ ] `ux3 scaffold view` creates complete view structure
- [ ] `ux3 scaffold service` creates service template
- [ ] `ux3 bundle analyze` shows bundle breakdown
- [ ] All commands documented in `src/cli/README.md`

---

### 1.2 Success Criteria

```
- [ ] Advanced routing fully functional
- [ ] Performance metrics collected
- [ ] CLI tools useful and tested
- [ ] Documentation complete
- [ ] Zero breaking changes to v1.1 apps
```

**Timeline**: 4-6 weeks post-launch

---

## Phase 3: v1.3 (Weeks 8-10 Post-Launch)

**Focus**: Developer experience and VSCode integration

### 1.3.1 VSCode Extension (~12 hours)

**Current State**: Not started

**What Needs Doing**:

1. **YAML completions**
   - Auto-complete FSM state definitions
   - Auto-complete service invocation parameters
   - File: VSCode extension in `packages/vscode-extension/`

2. **HTML template snippets**
   - `ux-if`, `ux-each`, `ux-style` snippets
   - Event binding `@click` snippets
   - File: VSCode extension

3. **FSM diagram preview**
   - Visualize FSM states and transitions
   - File: VSCode extension webview

4. **Route tree explorer**
   - Sidebar showing all routes
   - Navigate to route definitions
   - File: VSCode extension tree view

**Definition of Done**:
- [ ] Extension published to VSCode marketplace
- [ ] 50+ completions for common patterns
- [ ] FSM diagram renders and updates in real-time
- [ ] Route explorer shows full tree
- [ ] >100 installs in first week

---

### 1.3.2 Additional Documentation (~8 hours)

**What's Still Missing**:

1. **Offline & Resilience Patterns** — `docs/patterns/offline.md`
   - Service worker setup
   - Sync queue patterns
   - File: New

2. **Debugging Guide** — `docs/guides/debugging.md`
   - Using browser DevTools with UX3
   - FSM state inspection
   - Network debugging
   - File: New

3. **API Reference** — `docs/api-reference.md`
   - Auto-generated from TypeScript
   - Method signatures and types
   - File: New (script-generated)

---

### 1.3 Success Criteria

```
- [ ] VSCode extension installed by 100+ users
- [ ] All documentation written
- [ ] Developer happiness score >4/5
```

**Timeline**: 8-10 weeks post-launch

---

## Continuous Improvements (Ongoing)

### Bug Fixes & Stability
- Monitor GitHub issues and Discord
- Prioritize critical bugs (tier 1)
- Backport fixes to supported versions
- Maintain 98%+ test pass rate

### Community Feedback
- Monthly surveys (what do users need?)
- Track feature requests
- Showcase user projects
- Build reference apps

### Performance
- Quarterly bundle size audits
- Monitor Core Web Vitals
- Optimize compiler performance
- Keep framework <5KB gzipped

---

## Release Timeline Summary

```
v1.0.0  | March 3, 2026     | ✅ Launch (current)
v1.1.0  | Mid-March, 2026   | Service lifecycle, error recovery, test harness
v1.2.0  | Early April, 2026 | Routing, performance metrics, CLI
v1.3.0  | Mid-April, 2026   | VSCode extension, documentation
v1.4+   | Ongoing            | Community-driven features
```

---

## Tracking & Coordination

### Sprint Planning
- Weekly syncs to review progress
- File updates in this document weekly
- Link PRs to section numbers (e.g., "Closes #1.1.1")

### PR Review Checklist
- [ ] Related test added
- [ ] Related documentation updated
- [ ] No breaking changes (or justified)
- [ ] Backwards compatible with v1.0 apps
- [ ] TSC approves API changes

### Communication
- Update CHANGELOG.md for each release
- Announce on Twitter/Discord
- Write blog post for major features
- Celebrate community contributions

---

## Risk Mitigation

### Risk 1: Service Lifecycle Too Complex
**Mitigation**: Start with just auto-retry, expand later if needed
**Contingency**: Mark as optional feature, don't block other work

### Risk 2: Performance Observability Hard to Implement
**Mitigation**: Use existing metrics libraries (web-vitals), integrate existing tools
**Contingency**: Ship v1.2 without observability if blocked, move to v1.3

### Risk 3: Community Wants Different Features
**Mitigation**: Monthly surveys, quick feature polls
**Contingency**: Reprioritize phases based on feedback

---

## Success Metrics

Track these post-launch:

| Metric | Target | Timeline |
|--------|--------|----------|
| Weekly installs | >100 | By end of v1.0 |
| GitHub stars | >500 | By v1.1 |
| Test pass rate | ≥98% | Always |
| Framework size | <5KB | Always |
| Response time (docs) | <100ms | Always |
| VSCode extension installs | >100 | By v1.3 |
| Community apps published | >10 | By v1.2 |

---

## Next Immediate Steps (This Week)

1. **Day 1-2**: Review REVIEW2.md findings with team
2. **Day 3**: Plan v1.1 sprint (assign owners)
3. **Day 4-5**: Start implementation of 1.1.1 (service lifecycle)
4. **Daily**: Monitor issues, respond to community feedback

---

**Document Last Updated**: March 3, 2026  
**Next Review**: March 10, 2026
