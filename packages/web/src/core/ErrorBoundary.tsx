import { Component, type ReactNode } from "react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { useLang } from "@/core/i18n";

/**
 * Generic render-error boundary. Renders `fallback(retry)` when a descendant throws
 * during render — including data queries that `throwOnError` (see main.tsx) propagates
 * here. `retry` clears the boundary and, when `onReset` is supplied, resets the failed
 * queries so the subtree re-renders and refetches instead of staying dead.
 */
class RenderErrorBoundary extends Component<
  { children: ReactNode; fallback: (retry: () => void) => ReactNode; onReset?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[render]", error);
  }

  retry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false });
  };

  render() {
    return this.state.hasError ? this.props.fallback(this.retry) : this.props.children;
  }
}

function Fallback({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="space-y-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        {actionLabel}
      </button>
    </div>
  );
}

/**
 * Top-level render-error safety net for unexpected crashes. Recovery is a full reload
 * (state is unknown, so re-rendering in place is not trusted).
 */
export function ErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useLang();

  return (
    <RenderErrorBoundary
      fallback={() => (
        <Fallback
          title={t("error.boundary.title")}
          description={t("error.boundary.description")}
          actionLabel={t("error.boundary.reload")}
          onAction={() => window.location.reload()}
        />
      )}
    >
      {children}
    </RenderErrorBoundary>
  );
}

/**
 * Boundary for the authenticated app's data screens. A failed server/network query
 * (thrown via `throwOnError`) unmounts the failing screen and shows a fallback, so it
 * stops re-rendering and re-firing its queries. Retry resets the failed queries and
 * re-renders in place — no full reload, auth and routing stay intact.
 */
export function AppDataBoundary({ children }: { children: ReactNode }) {
  const { t } = useLang();

  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <RenderErrorBoundary
          onReset={reset}
          fallback={(retry) => (
            <Fallback
              title={t("error.boundary.title")}
              description={t("error.boundary.description")}
              actionLabel={t("error.boundary.retry")}
              onAction={retry}
            />
          )}
        >
          {children}
        </RenderErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
