// vite.config.js
// Configures the Vite dev server to serve /client as the root.

import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    open: true,
  },
  optimizeDeps: {
    // phaser3spectorjs uses require() which breaks in the browser.
    // Excluding it from pre-bundling prevents the crash.
    exclude: ['phaser3spectorjs'],
  },
  resolve: {
    alias: {
      // Stub the WebGL inspector so any direct import also resolves safely
      phaser3spectorjs: '/stubs/phaser3spectorjs.js',
    },
  },
});
