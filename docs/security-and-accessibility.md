# Security and Accessibility

## Security Baseline

- Do not use unsafe HTML insertion by default.
- Use sanitization helpers from `src/security/**` when rendering external HTML.
- Validate and sanitize user-provided URLs/content.
- Keep CSP and dependency hygiene in your deployment baseline.

## Accessibility Baseline

- Use semantic HTML and proper heading order.
- Ensure keyboard navigation for interactive elements.
- Provide accessible names/labels for controls.
- Add regression checks with `npm run a11y-audit` and E2E tests.

## Review Checklist

- Any new UI has accessible focus states.
- Any dynamic status/error is announced appropriately.
- Any user data rendering is escaped/sanitized.
