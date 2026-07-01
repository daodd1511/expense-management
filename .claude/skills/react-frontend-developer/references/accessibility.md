# Accessibility Rules

Follow **WCAG 2.1 AA** on every project.

## Semantic HTML

- Use semantic elements: `<section>`, `<article>`, `<nav>`, `<main>`, `<header>`, `<footer>`.
- Use `<button>` for interactive actions, `<a>` for navigation only.
- Never use a `<div>` or `<span>` as a clickable element.

## Forms

- Every form control must have an associated `<label>` (not a placeholder used as label).
- Add `aria-label` or visually-hidden text on controls/links that have no descriptive text. Avoid `title` — inconsistently announced by screen readers.

## Reusable Components

- Avoid `id` attributes in reusable components (use classes instead).

## Keyboard & Screen Reader

- Ensure all interactive elements are reachable and operable by keyboard.
- Test with screen readers; use ARIA attributes only when semantic HTML is insufficient.

## References

- HTML examples for labels, semantics, and ARIA: `references/accessibility.md`

---

# Accessibility Examples

## Labels & Form Controls

```html
<!-- ✅ Label associated with control -->
<label for="email">Email address</label>
<input id="email" type="email" />

<!-- ❌ Placeholder used as label -->
<input type="email" placeholder="Email address" />
```

## Interactive Elements

```html
<!-- ✅ Button for action, anchor for navigation -->
<button type="button" class="save-btn">Save</button>
<a href="/dashboard">Go to Dashboard</a>

<!-- ❌ div/span as clickable element -->
<div onclick="save()">Save</div>
```

## Semantic Structure

```html
<!-- ✅ Semantic landmarks -->
<nav aria-label="Main navigation">...</nav>
<main>...</main>
<article>...</article>

<!-- ✅ Visually-hidden label for icon-only controls -->
<button type="button" aria-label="Close dialog">✕</button>
```