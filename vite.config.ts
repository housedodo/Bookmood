/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Shown in Settings so you can tell whether the phone has the latest deploy.
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
  server: { host: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
