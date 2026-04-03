# Testing Patterns

## Frameworks
- Use `vitest` and `testing-library` for all web tests.

## Principles
- **Outcome-Based**: Write tests based on outcomes, not implementations.
- **Independence**: Create independent tests that clean up side effects (e.g., `afterEach(() => cleanup())`).
- **User Perspective**: Write tests from an accessible user's perspective.
- **Accessible Selection**: Simulate interactions using accessible roles (e.g., `getByRole`, `getByLabelText`), not IDs or class names.
- **No `testID`**: Avoid `testID` or `getByTestId()`.
- **Accessibility Verification**: Component tests must include `toHaveNoViolations` from `jest-axe`.
- **Fixtures**: Use shared fixtures or factories for setup.
- **Integration over Unit**: Prefer integration tests; use unit tests for pure functions.
- **Mocks**: Minimize mocks except for time, random, or external APIs.
- **Leverage Types**: Use the type system for type checking instead of tests.
