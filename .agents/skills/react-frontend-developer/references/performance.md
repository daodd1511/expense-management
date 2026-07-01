# Performance Rules

## Core Web Vitals Targets

Optimize for these from the start of every project:

- **LCP** (Largest Contentful Paint): < 2.5s
- **INP** (Interaction to Next Paint): < 200ms _(replaces FID, measured since Mar 2024)_
- **CLS** (Cumulative Layout Shift): < 0.1

## Loading Strategy

- Implement lazy loading and code splitting for all heavy routes/features.
- Never eagerly load modules that are not needed on initial render.
- Use `defer` / `async` for non-critical scripts.

## Assets

- Optimize all images (compress, correct format, explicit `width`/`height`).
- Use semantic CSS custom properties for theming: `--primary-color`, `--accent-color`, `--tertiary-color`.
- Avoid unnecessary re-renders; measure before optimizing.

## References

- Code splitting examples for React, Angular, Vue: `references/performance.md`

---

# Performance Examples

## Code Splitting

```tsx
// ✅ React — route-level lazy loading
const Dashboard = React.lazy(() => import('./pages/Dashboard'))

<Suspense fallback={<Spinner />}>
  <Dashboard />
</Suspense>
```

```ts
// ✅ Angular — lazy-loaded standalone component
{
  path: 'dashboard',
  loadComponent: () =>
    import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
}
```

```ts
// ✅ Vue — async component
const Dashboard = defineAsyncComponent(() => import('./pages/Dashboard.vue'))
```