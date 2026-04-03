# Coding Standards

## TypeScript
- Use TypeScript for all Javascript code unless otherwise specified.
- If using Javascript, provide type definitions in JSDoc and use the `@ts-check` pragma.
- Avoid use of `any` type; use `unknown` for dynamic types.
- Use `as const` for object literals.
- Lean towards type-safety but maintain a balance with verbosity.
- Check for existing types before creating new ones.
- Ensure no TypeScript errors or warnings.
- Use strict null checks and avoid non-null assertion operator (`!`).

## HTML & Accessibility
- Use semantic HTML elements.
- Always consider accessibility.
- Use ARIA roles, attributes, states, properties, labels, descriptions, and landmarks where appropriate.
