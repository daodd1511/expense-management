import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { VitePWA } from 'vite-plugin-pwa'

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
        theme_color: 'oklch(0.985 0.004 90)',
        background_color: 'oklch(0.985 0.004 90)',
        display: 'standalone',
        start_url: '/',
        lang: 'vi',
        icons: [],
      },
    }),
  ],
})
