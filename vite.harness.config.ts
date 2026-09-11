import { askr } from '@askrjs/vite';
import { defineConfig } from 'vite-plus';

/**
 * Minimal dev server config used only to serve tests/browser/harness.html for
 * the native Playwright browser tests. Not used for the library build (see
 * vite.config.ts / `vp pack`).
 *
 * `server.host` is pinned to 127.0.0.1 so Playwright's `webServer` readiness
 * probe, which polls the literal address, matches what Vite actually binds.
 */
export default defineConfig({
  plugins: [askr()],
  server: {
    host: '127.0.0.1',
    port: 4320,
    strictPort: true,
  },
  optimizeDeps: {
    include: ['monaco-editor', 'axe-core'],
  },
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: '@askrjs/askr',
    },
    jsxInject:
      "import { jsx, jsxs, Fragment } from '@askrjs/askr/jsx-runtime';",
  },
});
