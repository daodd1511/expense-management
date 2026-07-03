import { Component, type ReactNode } from 'react'
import { useLang } from '@/core/i18n'

class ErrorBoundaryImpl extends Component<
  { children: ReactNode; title: string; reloadLabel: string },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[render]', error)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-base font-semibold text-foreground">{this.props.title}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          {this.props.reloadLabel}
        </button>
      </div>
    )
  }
}

/**
 * Top-level render-error safety net. React error boundaries must be class
 * components (no hook equivalent), so this wraps the class in a function
 * component that supplies i18n'd copy via props.
 */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useLang()

  return (
    <ErrorBoundaryImpl title={t('error.boundary.title')} reloadLabel={t('error.boundary.reload')}>
      {children}
    </ErrorBoundaryImpl>
  )
}
