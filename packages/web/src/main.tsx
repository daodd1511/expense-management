import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./shared/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Toaster } from "sonner";
import { ApiError, isServerError } from "./core/api";
import { handleQueryError } from "./core/queryErrorHandler";
import { AuthProvider } from "./features/auth/auth";
import { LangProvider } from "./core/i18n";
import { ErrorBoundary } from "./core/ErrorBoundary";
import { handleMutationError } from "./core/mutationErrorHandler";
import { PwaUpdateProvider } from "./core/PwaUpdateProvider";
import { registerForegroundSWUpdateCheck } from "./core/swUpdate";
import { AppRouter } from "./routing/router";
import { ThemeProvider } from "./shared/components/ThemeProvider";
import { OfflineBanner } from "./shared/components/OfflineBanner";
import { TooltipProvider } from "./shared/components/ui/tooltip";

registerForegroundSWUpdateCheck();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // 4xx are permanent (bad request, unauthorized, not found) — retrying only
      // hammers the API. Retry transient failures (5xx / network) at most twice
      // with exponential backoff, then give up and surface the error.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      // Once a query has given up, leave it alone. Without this, a window refocus or
      // network blip re-fires every failed query, so a dead API gets hammered in
      // repeating bursts instead of failing once and stopping.
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      // Server/network failures throw to the app error boundary, which unmounts the
      // failing screen (so it stops re-rendering and re-firing its queries) and shows
      // a Retry fallback. 4xx stay inline (empty state + toast) — they're per-request.
      throwOnError: isServerError,
    },
  },
  queryCache: new QueryCache({ onError: handleQueryError }),
  mutationCache: new MutationCache({ onError: handleMutationError }),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <LangProvider>
            <TooltipProvider>
              <PwaUpdateProvider>
                <Toaster richColors position="top-center" />
                <OfflineBanner />
                <ErrorBoundary>
                  <AppRouter />
                </ErrorBoundary>
              </PwaUpdateProvider>
            </TooltipProvider>
          </LangProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
