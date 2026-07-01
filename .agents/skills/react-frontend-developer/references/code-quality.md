# Code Quality Rules

## Fundamentals

- Follow **SOLID, KISS, DRY, and YAGNI** — do not over-engineer.
- Write explicit, self-documenting code over clever shortcuts.
- Isolate side effects; keep functions focused on a single responsibility.
- Promote immutability: use `readonly` types; avoid mutating shared state.
- Never use `any`; use strict TypeScript typing throughout.

## Naming

Use **S-I-D**: Short, Intuitive, Descriptive.

- No abbreviations that require context to decode.
- Name event handlers explicitly: `handleSubmit`, `handleUserClick`.
- Don't duplicate context: `MenuItem.handleClick()` not `MenuItem.handleMenuItemClick()`.

## API Design

- Use **object parameters** for functions/callbacks that take more than one argument.
  - Allows adding new properties without breaking existing callers.
- Avoid positional parameters beyond two arguments.

## Tooling

- Set up **EditorConfig, ESLint, Prettier, and Stylelint** on every project.
- Enforce linting in CI; do not bypass checks.

## References

- Naming and API design examples: `references/code-quality.md`

---

# Code Quality Examples

## Naming (S-I-D)

```ts
// ✅ Descriptive, no context duplication
const handleUserClick = (user: User) => { /* ... */ }
MenuItem.handleClick()

// ❌ Abbreviated / duplicated context
const handleUCk = (u: User) => { /* ... */ }
MenuItem.handleMenuItemClick()
```

## Object Parameters

```ts
// ✅ Object params — safe to extend without breaking callers
function createUser(params: { name: string; email: string; role: Role }): User { /* ... */ }

// ❌ Positional — adding a param breaks every call site
function createUser(name: string, email: string, role: Role): User { /* ... */ }
```