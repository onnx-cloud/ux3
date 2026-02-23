# Build & Dev — App Guide

Overview
---
How to run, build, and debug the App example App  locally and in CI.

Commands
---
- Start local dev: `npm run dev:iam` (runs dev server and hot-reload)
- Build for production: `npm run build` (project-level build; for example App s this includes compile step)
- Run tests: `npm test` or `npm run test:e2e` for Playwright

Compiler hooks
---
- Run `npx ux3 compile` or `npm run build` to compile views, emit generated files under `examples/iam/generated`, and run validators.

Debugging
---
- Use `npm run dev:iam` and open browser console. Use generated diagnostics when build validators fail.

Reference
---
- `README.md` and `todo/TODO.md` for planned improvements