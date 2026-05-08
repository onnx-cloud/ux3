# Forms and Validation

## Form Modeling

- Keep form state in FSM context.
- Represent edit, submit, success, and error as explicit states.
- Prefer deterministic transitions over ad-hoc flags.

## Validation Strategy

- Run schema and config validation during build.
- Keep field-level validation close to domain rules.
- Return structured errors suitable for i18n and UI rendering.

## UX Guidance

- Show validation feedback near the source field.
- Preserve user input on recoverable failures.
- Support keyboard and screen-reader friendly error summaries.

## Test Guidance

- Unit-test validators.
- Integration-test submit/retry flows.
- Add E2E coverage for critical form journeys.
