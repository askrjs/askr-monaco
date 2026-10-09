# @askrjs/monaco

[![CI](https://github.com/askrjs/askr-monaco/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/askrjs/askr-monaco/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40askrjs%2Fmonaco.svg)](https://www.npmjs.com/package/@askrjs/monaco)

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

- The root exports `MonacoEditor`, `MonacoEditorProps`, and `MonacoEditorOptions`.
- Editor tests use Monaco's native model/edit APIs; deterministic driver code
  lives in this repository's test suite.
- `MonacoEditor` lazy-loads Monaco by default or accepts an injected namespace.
- Wrapper-owned concerns are host lifecycle, model wiring, and typed escape hatches.
- Controlled parent rerenders retain the live editor host, so focus, selection,
  history, and completion state survive model-content callbacks. Actual component
  unmount remains the single disposal boundary.
- Wrapper-owned `path` values (usage without a `model` prop) must be unique.
  Externally-owned models are exempt from this wrapper check; pass an existing
  Monaco model through `model={monaco.editor.getModel(uri)}` when sharing is
  intentional, and retain responsibility for its identity and disposal.
- Monaco's `setTheme` API is process-global. The `theme` prop configures that
  shared Monaco namespace, so simultaneous editors cannot display different
  themes; the most recently applied theme wins.

## Layout

- `src/components/monaco-editor` - public wrapper surface
- `tests` - unit, jsdom, and browser smoke coverage
- `docs` - repo notes and package overview

## Docs

- [Docs index](./docs/README.md)
- [Package overview](./docs/askr-monaco.md)
- [Testing editor interactions](./docs/testing.md)
- [Vite and Rolldown lazy workers](./docs/vite-lazy-workers.md)

## Migrating to 0.5

Import the component and its wrapper-specific props/options from `@askrjs/monaco`.
The duplicate `@askrjs/monaco/monaco-editor` path and test-only
`@askrjs/monaco/testing` path are removed. The two test-driver exports move into
this repository's private test helpers; use Monaco's native edit and history
APIs in application tests (see [testing guidance](./docs/testing.md)).

Native aliases `MonacoEditorInstance`, `MonacoTextModel`, `MonacoUri`, and
`MonacoNamespace` are private: use `monaco-editor` types
`editor.IStandaloneCodeEditor`, `editor.ITextModel`, `Uri`, and
`typeof import('monaco-editor/editor/editor.api')`. Callback aliases
`MonacoLoader`, `MonacoBeforeMount`, `MonacoMountHandler`, and `MonacoErrorHandler`
are private: derive callbacks from `MonacoEditorProps['loadMonaco']`,
`['beforeMount']`, `['onMount']`/`['onUnmount']`, and `['onError']`.
