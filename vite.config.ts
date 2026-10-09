import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';

const srcRoot = fileURLToPath(new URL('./src', import.meta.url));

const packageEntries = { index: resolve(srcRoot, 'index.ts') };

export default defineConfig({
  fmt: {
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    printWidth: 80,
    tabWidth: 2,
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@askrjs/askr',
  },
  pack: {
    entry: packageEntries,
    format: ['esm'],
    outDir: 'dist',
    platform: 'neutral',
    tsconfig: 'tsconfig.pack.json',
    dts: true,
    sourcemap: true,
    unbundle: true,
    treeshake: false,
    deps: {
      neverBundle: [/^@askrjs\/askr(?:\/.*)?$/],
    },
  },
  build: {
    minify: false,
    sourcemap: true,
    lib: {
      entry: packageEntries,
    },
    rollupOptions: {
      external: (id) => /^@askrjs\/askr(?:\/.*)?$/.test(id),
      output: {
        dir: 'dist',
        entryFileNames: '[name].js',
        exports: 'named',
        format: 'es',
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
  },
});
