# Services — App Guide

Overview
---
IAM's services are declared in `examples/iam/ux/service/services.yaml` and wired via the project's `ServiceRegistry`. Services include HTTP APIs, auth, and in-App  mocks for development.

Where to look
---
- Service definitions: `examples/iam/ux/service/services.yaml`
- Service resolver & runtime: `src/build/service-resolver.ts` and `src/services/*`

Guidelines
---
- Declare service endpoints and client configuration in `services.yaml`.
- Use environment-specific overrides for dev (mocks) vs production APIs.
- Use the `services` mechanism to create test doubles for E2E and integration tests.

Examples
---
- Http service example: define base URL and paths in `services.yaml` and reference them from invocations in views.

Testing
---
- Add unit tests for services under `src/services/__tests__` and integration tests in `examples/iam` that stub network requests.

Reference
---
- `src/services` for runtime implementations
- `src/build/service-resolver.ts` for compilation-time resolution of service configs