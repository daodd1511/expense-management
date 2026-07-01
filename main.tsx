import '@fontsource/be-vietnam-pro/400.css'
import '@fontsource/be-vietnam-pro/500.css'
import '@fontsource/be-vietnam-pro/600.css'
import '@fontsource/be-vietnam-pro/700.css'
import './app/globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StoreProvider } from './lib/store'
import { LangProvider } from './lib/i18n'
import { ThemeProvider } from './components/theme-provider'
import { ResponsiveApp } from './components/responsive-app'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <StoreProvider>
          <ResponsiveApp />
        </StoreProvider>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>
)
