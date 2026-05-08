# Services and Side Effects

Services are the boundary for IO and external dependencies.

## Where Service Logic Lives

- Service definitions and adapters: `src/services/**`
- FSM `invoke` calls service methods
- Templates stay free of network logic

## Invoke Forms

- Local function: `{ src: 'localFn' }`
- Service method: `{ service: 'user', method: 'login' }`

## Error Handling

- Return structured failures from services.
- Transition FSMs to explicit error states.
- Centralize retry policy in FSM transitions or service wrappers.

## Testing

- Unit-test services in isolation.
- Test FSM-service integration with stubs/mocks.
- Avoid relying on live network in CI tests.
