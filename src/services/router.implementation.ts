/**
 * Navigation Integration Guide
 *
 * This file demonstrates how NAV.md is implemented in the UX3 framework.
 */

// IMPLEMENTATION SUMMARY
// =====================
//
// 1. Router Service (src/services/router.ts)
//    - Matches URLs against configured routes
//    - Extracts path parameters (e.g., :exchange in /market/:exchange)
//    - Builds NavConfig from manifest routes and FSM registry
//
// 2. NavConfig Object
//    - `routes`: list of all navigable views with paths, labels, params
//    - `current`: current page (path, view, params)
//    - `canNavigate(view)`: check if FSM is registered
//    - `getLabel(route, i18n)`: resolve i18n label for a route
//
// 3. AppContextBuilder Integration
//    - New `withRouter()` method builds router from config
//    - Router is auto-built in `build()` if not already called
//    - NavConfig is injected into AppContext as `context.nav`
//
// 4. Template Usage
//    - Layouts receive `{{ nav }}` in render context
//    - Iterate `nav.routes` to build dynamic nav menus
//    - Use `nav.current.path` to determine active link
//    - Call `nav.canNavigate(view)` to disable unreachable links

// EXAMPLE 1: Build context with router
// =====================================
//
// import { AppContextBuilder } from './ui/context-builder.js';
//
// const config = { /* generated from build */ };
// const context = new AppContextBuilder(config)
//   .withMachines()
//   .withServices()
//   .withI18n()
//   .withRouter()  // Explicitly build router, or auto-built in .build()
//   .build();
//
// console.log(context.nav?.routes); // [{ path: '/', view: 'home', label: 'header.home', ... }]
// console.log(context.nav?.current); // { path: '/market', view: 'market', params: {} }

// EXAMPLE 2: Use NavConfig in templates
// ======================================
//
// In a layout HTML template, receive `{ nav: NavConfig, i18n, site }`:
//
// <nav>
//   {{#each nav.routes}}
//     <a href="{{this.path}}"
//        {{#if (eq ../nav.current.path this.path)}}class="active"{{/if}}
//        {{#unless (../nav.canNavigate this.view)}}disabled{{/unless}}>
//       {{../nav.getLabel this}}
//     </a>
//   {{/each}}
// </nav>

// EXAMPLE 3: Navigate programmatically
// ======================================
//
// In a service or FSM action:
//
// const router = appContext.router;
// const match = router.navigate('/market');
// if (match) {
//   const currentNav = router.getNavConfig();
//   console.log(currentNav.current); // { path: '/market', view: 'market', params: {} }
//   // Send navigation event to FSM
//   fsm.send('NAVIGATE', { path: '/market' });
// }

// DESIGN PRINCIPLES
// =================
//
// 1. Routes are the source of truth
//    - config.routes defines which views are navigable
//    - FSMs without routes are invisible to navigation
//
// 2. Navigation visibility is template-driven
//    - Only states with `template` field render the layout
//    - States with only `invoke` (no template) don't show nav
//    - This naturally gates navigation during loading
//
// 3. NavConfig is immutable & reusable
//    - Built once at app startup
//    - Passed to every view template via context
//    - Enables consistent, dynamic menus across the app
//
// 4. FSM guards control reachability
//    - `canNavigate(view)` checks if FSM exists
//    - FSM transitions can block navigation (e.g., no leave during submit)
//    - Router enforces valid state transitions
//
// 5. History & browser back/forward
//    - popstate listeners send NAVIGATE events
//    - Router updates window.history.pushState on navigation
//    - Current path/view/params always reflect browser location
