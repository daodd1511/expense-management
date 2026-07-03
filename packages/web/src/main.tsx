import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import './shared/styles/globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './features/auth/auth'
import { StoreProvider } from './core/store'
import { LangProvider } from './core/i18n'
import { ThemeProvider } from './shared/components/ThemeProvider'
import { AuthGate } from './features/auth/components/AuthGate'
import { ResponsiveApp } from './layouts/ResponsiveApp'
import { OfflineBanner } from './shared/components/OfflineBanner'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <LangProvider>
            <OfflineBanner />
            <AuthGate>
              <StoreProvider>
                <ResponsiveApp />
              </StoreProvider>
            </AuthGate>
          </LangProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>
)
