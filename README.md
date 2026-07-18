# @askrjs/monaco

ESM-only Askr wrapper for Monaco Editor.

This package keeps the wrapper thin on purpose: it hosts Monaco inside an Askr
component without inventing a second editor API. Raw Monaco `options`, external
`model` ownership, and direct editor/namespace escape hatches are the contract.

## Install

```sh
npm install @askrjs/monaco monaco-editor
```

## Import

```ts
import { MonacoEditor } from '@askrjs/monaco';
import * as monaco from 'monaco-editor';
```

## Example

```tsx
const model = monaco.editor.createModel(
  'const answer = 42;',
  'typescript',
  monaco.Uri.parse('file:///src/example.ts')
);

<MonacoEditor
  monaco={monaco}
  model={model}
  options={{ automaticLayout: true, minimap: { enabled: false } }}
  onMount={(editor) => {
    editor.focus();
  }}
/>;
```

## Status

- Root package and direct subpath exports expose the thin wrapper.
- `MonacoEditor` lazy-loads Monaco by default or accepts an injected namespace.
- Wrapper-owned concerns are host lifecycle, model wiring, and typed escape hatches.
- Wrapper-owned `path` values must be unique; pass an existing Monaco model
  through `model={monaco.editor.getModel(uri)}` when sharing is intentional.

## Layout

- `src/components/monaco-editor` - public wrapper surface
- `tests` - unit, jsdom, and browser smoke coverage
- `docs` - repo notes and package overview

## Docs

- [Docs index](./docs/README.md)
- [Package overview](./docs/askr-monaco.md)
