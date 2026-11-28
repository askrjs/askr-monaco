import { defineConfig } from 'vite-plus';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@askrjs/askr',
  },
});
