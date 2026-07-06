import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import './shared/styles/globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider } from './features/auth/auth'
import { LangProvider } from './core/i18n'
import { ErrorBoundary } from './core/ErrorBoundary'
import { handleMutationError } from './core/mutationErrorHandler'
import { registerForegroundSWUpdateCheck } from './core/swUpdate'
import { AppRouter } from './routing/router'
import { ThemeProvider } from './shared/components/ThemeProvider'
import { OfflineBanner } from './shared/components/OfflineBanner'

registerForegroundSWUpdateCheck()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
  mutationCache: new MutationCache({ onError: handleMutationError }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <LangProvider>
            <Toaster richColors position="top-center" />
            <OfflineBanner />
            <ErrorBoundary>
              <AppRouter />
            </ErrorBoundary>
          </LangProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
