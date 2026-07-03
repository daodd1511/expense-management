import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { VitePWA } from 'vite-plugin-pwa'

const apiProxyTarget = process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Sổ Chi Tiêu',
        short_name: 'Wallet',
        theme_color: '#fbfaf7',
        background_color: '#fbfaf7',
        display: 'standalone',
        start_url: '/',
        lang: 'vi',
      },
      pwaAssets: {
        image: 'public/app-icon.svg',
        // Manual links in index.html: the SVG favicon must stay on the light/dark
        // adaptive icon.svg, not this fixed-color install icon.
        includeHtmlHeadLinks: false,
        injectThemeColor: false,
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      '/health': {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
