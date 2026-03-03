/**
 * SPA Navigation E2E Tests
 *
 * Tests that the IAM example application:
 *  1. Injects a REAL hydration script (not the "bundle pending" placeholder)
 *  2. Mounts the correct <ux-*> view element into #ux-content on each route
 *  3. Handles History API back/forward without full page reloads
 *  4. Intercepts local <a> clicks and performs client-side navigation
 *  5. Handles parameterised routes (e.g. /market/:exchange)
 *
 * These tests specifically guard against the recurring bugs:
 *  - Bundler silent failure → empty bundleRel → placeholder injected
 *  - View compiler generating un-resolvable imports (@ux3/ui, ux/logic/shared)
 *  - Navigation handler not wiring popstate / click intercept correctly
 */
export {};
//# sourceMappingURL=navigation.spec.d.ts.map