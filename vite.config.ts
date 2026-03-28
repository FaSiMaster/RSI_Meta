import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Fuer GitHub Pages: base: '/RSI_Meta/'
// Fuer Vercel / lokaler Dev: base: '/'
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'RSI VR Tool – FaSi Kanton Zürich',
        short_name: 'RSI VR',
        description: 'Immersives Road Safety Inspection Tool fuer Meta Quest',
        theme_color: '#003C71',
        background_color: '#0f0f1a',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  base: '/',
})
