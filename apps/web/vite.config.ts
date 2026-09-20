import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// vite-plugin-pwa generates the Workbox precache manifest from the REAL build
// output, including hashed bundle filenames. This is the fix for the
// hand-written serviceWorker.js, which only ever cached /index.html and so
// failed on a cold offline start.
export default defineConfig({
  server: { proxy: { '/api': 'http://localhost:8787' } },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Network first, but always fall back to the last good copy.
            urlPattern: /\/api\/market\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'market-data',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 60 * 60 * 24 * 14 },
            },
          },
        ],
      },
      manifest: {
        name: 'Farming Scenario & Decision Simulator',
        short_name: 'Farm Simulator',
        description: 'Compare farming decisions before you commit. Works without a network.',
        start_url: '/',
        display: 'standalone',
        background_color: '#EEF1EC',
        theme_color: '#16211C',
        orientation: 'portrait-primary',
        lang: 'en-IN',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
