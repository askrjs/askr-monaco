# Vite and Rolldown lazy workers

The root `@askrjs/monaco` entry dynamically imports the full `monaco-editor`
package when you omit both `monaco` and `loadMonaco`. Use
`@askrjs/monaco/explicit` when your app supplies Monaco and knows which
languages it needs. It requires a `monaco` namespace or `loadMonaco` function,
so Vite can omit the default import and its bundled languages without a
resolve alias. Both entries use the same editor lifecycle and worker setup.

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

In Monaco 0.58, register the JavaScript and TypeScript language definitions
separately from their shared language service:

```ts
export async function loadMonaco() {
  const [monaco] = await Promise.all([
    import('monaco-editor/editor/editor.api'),
    import('monaco-editor/languages/definitions/javascript/register'),
    import('monaco-editor/languages/definitions/typescript/register'),
    import('monaco-editor/language/typescript/monaco.contribution'),
  ]);

  return monaco;
}
```

Import the worker setup once from the application entry, then pass that loader
to the component:

```tsx
import './monaco-workers';
import { MonacoEditor } from '@askrjs/monaco/explicit';
import { loadMonaco } from './load-monaco';

<MonacoEditor
  language="typescript"
  defaultValue="const answer = 42;"
  loadMonaco={loadMonaco}
/>;
```

The checked-in [`examples/vite-lazy-workers`](../examples/vite-lazy-workers)
application is built during the check suite. Its production contract requires:

- an initial JavaScript entry no larger than 240 kB;
- a distinct dynamically imported Monaco editor chunk no larger than 3 MB;
- an editor worker no larger than 1 MB;
- a TypeScript worker no larger than 8 MB; and
- no JSON, CSS, or HTML language worker.

These are uncompressed file-size guardrails, not network-transfer estimates.
Raise one only when a reviewed Monaco or Vite upgrade has a justified size
change.

In a production build of the example app with a large TypeScript document
(Monaco 0.58, Vite+ 1.8), the explicit entry emitted 2.70 MB of gzipped
JavaScript, workers, and CSS in total, compared with 3.47 MB for the full
default loader. Emitted language and editor workers dropped from five to two.
These totals include lazy assets. The initial JavaScript entry was about
38 kB gzipped in both builds.
