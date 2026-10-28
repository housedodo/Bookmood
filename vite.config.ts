/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon-64.png'],
      manifest: {
        id: './',
        name: 'ShelfScan',
        short_name: 'ShelfScan',
        description: 'Scan your books, keep a cozy shelf, and pick your next read by mood.',
        theme_color: '#FFB3CE',
        background_color: '#FFF5F8',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + bundled fonts, so the library opens offline. Book lookups stay network-only.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        // The back-cover reader (~16 MB) is only downloaded when first used, then kept in its own cache.
        globIgnores: ['ocr/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/ocr/'),
            handler: 'CacheFirst',
            options: { cacheName: 'ocr', expiration: { maxEntries: 10 } },
          },
        ],
        navigateFallback: 'index.html',
        // Opening /api/… in the address bar must reach the Worker, not get the app page.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: { host: true },
  // Shown in Settings so you can tell whether the phone has the latest deploy.
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
