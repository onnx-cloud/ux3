# Accessibility — App Component Guidance

Principles
---
- Components should be accessible by default: semantic roles, keyboard navigation, focus management, and ARIA when necessary.
- Use `delegatesFocus` when host should forward focus; prefer native controls for form elements where possible.

Checklist
---
- Keyboard: Ensure tab order and keyboard interactions (Enter/Escape/Arrow keys) are implemented where relevant.
- Roles & ARIA: Provide clear roles and make ARIA attributes settable by consumers.
- Focus: Use `delegatesFocus` or explicit focus handling; ensure visible focus indicators.
- Forms: Verify `ElementInternals` participation or fallback mApp ing for slotted inputs.

Testing
---
- Add automated a11y checks in CI (axe or Playwright accessibility checks) for key views in IAM.
- Add unit tests for focus behavior and label associations.

Reference
---
- SLOTS cookbook: `docs/SLOTS_COOKBOOK.md`
