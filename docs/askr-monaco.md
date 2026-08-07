# Package Overview

`@askrjs/monaco` is the ESM-only Askr-facing wrapper for Monaco Editor.

It publishes a thin `MonacoEditor` host that forwards real Monaco models,
options, lifecycle hooks, and imperative escape hatches instead of recreating
Monaco's API in wrapper-specific props.

Controlled value updates preserve Monaco's editor instance and its
imperatively managed DOM. Updating parent Askr state from
`onDidChangeModelContent` does not require remounting the wrapper.

## Published surface

- `@askrjs/monaco`
- `@askrjs/monaco/monaco-editor`
- `@askrjs/monaco/testing`

## Install

```sh
npm install @askrjs/monaco monaco-editor
```

## Import

```tsx
import { MonacoEditor } from '@askrjs/monaco';
import * as monaco from 'monaco-editor';

const model = monaco.editor.createModel(
  'const answer = 42;',
  'typescript',
  monaco.Uri.parse('file:///src/example.ts')
);

<MonacoEditor
  monaco={monaco}
  model={model}
  options={{ automaticLayout: true }}
/>;
```

## Wrapper contract

- `options` forwards raw Monaco construction options.
- `model` lets callers retain full Monaco model ownership when needed.
- `value`, `defaultValue`, `language`, and `path` cover wrapper-owned internal models.
- Wrapper-owned `path` values must be unique. To share a URI-backed model,
  resolve it with `monaco.editor.getModel(uri)` and pass it explicitly through
  `model`.
- `beforeMount`, `onMount`, `onUnmount`, `editorRef`, and `monacoRef` expose the underlying Monaco lifecycle directly.

For deterministic editor tests and production worker loading, see
[Testing editor interactions](./testing.md) and
[Vite and Rolldown lazy workers](./vite-lazy-workers.md).
