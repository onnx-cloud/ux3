/**
 * Navigation handler unit tests
 *
 * Covers BUG-2 (views are actually mounted into #ux-content) and
 * BUG-9 (parameterised route matching e.g. /market/:exchange).
 *
 * Extended suite covers:
 *  - window.history.pushState is called with correct args
 *  - popstate event triggers re-navigation to current URL
 *  - Anchor <a> click is intercepted by setupNavigation
 *  - External / hash / disabled links are NOT intercepted
 *  - canNavigate() returning false blocks all navigation
 */
export {};
//# sourceMappingURL=navigation-handler.test.d.ts.map