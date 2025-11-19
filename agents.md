# Agent instructions

## Styling instructions

- Don't use or suggest tailwind
- Prefer logical selectors
- Prefer atomic styles that can be composed, especially where using CSS Modules
- Use CSS variable and create descriptive design token variables (e.g. --s-1 for spacing * 1, or --fs-body-m for body text medium). Abstract away specific values like colours or sizes into design tokens for maintainability.
- Make use of a global index.css to create theme styles, and individual component styles for component scoped styles. Use cascade layers to scope styles

## Testing instructions

- **Use `vitest` and `testing-library` for all tests (web).**
- **Use `@testing-library/react-native` and `jest-expo` for React Native.**
- **Never use `testID` or `getByTestId()` in React Native tests.**

- **Write tests based on outcomes, not implementations.**
  Good:

  ```typescript
  it('displays error message when login fails', async () => {
    // ...test code...
  });
  ```

  Bad:

  ```typescript
  it('calls handleLogin function', () => {
    // ...test code...
  });
  ```

- **Create independent tests that clean up side effects.**
  Good:

  ```typescript
  afterEach(() => cleanup());
  ```

- **Write tests from an accessible user's perspective. Simulate user interactions using accessible roles, not IDs or class names.**
  - Test using `getByRole`, `getByLabelText`, `getByText`, not `testID` or `getByTestId`

  *Good:*

  ```typescript
  await user.click(screen.getByRole('button', { name: /submit/i }));
  ```

  *Bad:*

  ```typescript
  await user.click(screen.getByTestId('submit-btn'));
  ```

- **Use shared fixtures or factories for setup.**
- **Prefer integration tests for typical code; reserve unit tests for pure functions.**
- **Leverage the type system, not tests, for type checking.**
- **Minimize mocks except for time, random, or external APIs if possible while maintaining test encapsulation.**
- **React component tests must include `toHaveNoViolations` from "jest-axe".**
  Good:

  ```typescript
  expect(await axe(container)).toHaveNoViolations();
  ```