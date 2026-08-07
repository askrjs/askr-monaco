import { defineConfig } from 'vite-plus';

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@askrjs/askr',
  },
  resolve: {
    alias: [
      {
        find: /^monaco-editor$/,
        replacement: 'monaco-editor/editor/editor.api',
      },
    ],
  },
});
