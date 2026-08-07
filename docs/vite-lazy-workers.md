# Vite and Rolldown lazy workers

`MonacoEditor` dynamically imports the convenient `monaco-editor` root when no
`monaco` or `loadMonaco` prop is supplied. Vite 8 and its Rolldown production
build preserve that boundary, keeping Monaco out of the initial application
entry. The root registers all bundled languages, so applications that want only
selected languages should supply a modular loader.

Because the wrapper retains its zero-configuration fallback, alias the exact
root import to the modular editor API in applications that opt into a curated
language set:

```ts
import { defineConfig } from 'vite-plus';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^monaco-editor$/,
        replacement: 'monaco-editor/editor/editor.api',
      },
    ],
  },
});
```

The regular string imports used for workers and language contributions are not
matched by this exact alias.

Monaco still needs an editor worker for core services. Language workers are
optional: register only the languages the application enables. This setup adds
the required editor worker and the JavaScript/TypeScript worker while omitting
the JSON, CSS, and HTML workers:

```ts
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TypeScriptWorker from 'monaco-editor/language/typescript/ts.worker?worker';

self.MonacoEnvironment = {
  getWorker(_moduleId, label) {
    if (label === 'javascript' || label === 'typescript') {
      return new TypeScriptWorker();
    }

    return new EditorWorker();
  },
};
```

Load Monaco's editor API and only the language contributions the application
uses:

```ts
export async function loadMonaco() {
  const [monaco] = await Promise.all([
    import('monaco-editor/editor/editor.api'),
    import('monaco-editor/language/typescript/monaco.contribution'),
  ]);

  return monaco;
}
```

Import the worker setup once from the application entry, then pass that loader
to the component:

```tsx
import './monaco-workers';
import { MonacoEditor } from '@askrjs/monaco';
import { loadMonaco } from './load-monaco';

<MonacoEditor
  language="typescript"
  defaultValue="const answer = 42;"
  loadMonaco={loadMonaco}
/>;
```

The checked-in [`examples/vite-lazy-workers`](../examples/vite-lazy-workers)
application is built during the check suite. Its production contract requires:

- an initial JavaScript entry no larger than 225 kB;
- a distinct dynamically imported Monaco editor chunk no larger than 3 MB;
- an editor worker no larger than 1 MB;
- a TypeScript worker no larger than 8 MB; and
- no JSON, CSS, or HTML language worker.

These are uncompressed file-size guardrails, not network-transfer estimates.
Raise one only when a reviewed Monaco or Vite upgrade has a justified size
change.
