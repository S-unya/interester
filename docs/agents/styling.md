# Styling Guidelines

- Don't use or suggest Tailwind CSS.
- Prefer logical selectors.
- Prefer atomic styles that can be composed, especially with CSS Modules.
- Use CSS variables for design tokens (e.g., `--s-1` for spacing, `--fs-body-m` for body text).
- Abstract specific values like colors or sizes into design tokens.
- Use a global `index.css` for theme styles and individual component styles for scoped styles.
- Use cascade layers to scope styles.
