import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

// Version aus package.json injizieren — Single Source of Truth.
// Verfügbar im Code als import.meta.env.VITE_APP_VERSION.
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8')) as { version: string }

// Fuer GitHub Pages: base: '/RSI_Meta/'
// Fuer Vercel / lokaler Dev: base: '/'
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Statische Seiten vom SPA-Fallback ausnehmen — sonst routet der
        // Service Worker /impressum.html etc. auf die index.html (App-Shell).
        // KEIN $-Anchor: Landing-Page haengt ?lang=de an. Mit $ matcht die
        // Denylist die Query nicht und der SW fallback-routed auf App-Shell.
        navigateFallbackDenylist: [
          /^\/impressum\.html/,
          /^\/datenschutz\.html/,
          /^\/glossar\.html/,
        ],
        // Belt-and-braces: die statischen Rechtstexte stets per Network zuerst
        // laden. So kommt der User auch dann auf die richtige Seite, wenn ein
        // Alt-Service-Worker aus v0.4.x die App-Shell noch im Cache hat.
        runtimeCaching: [
          {
            urlPattern: /\/(impressum|datenschutz|glossar)\.html(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'rsi-static-pages',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 6, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
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
