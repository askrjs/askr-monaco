# Changelog

## Unreleased

### Breaking changes

- Export only `MonacoEditor`, `MonacoEditorProps`, and `MonacoEditorOptions` from
  the root. Import the component from `@askrjs/monaco`; the duplicate
  `@askrjs/monaco/monaco-editor` path is removed.
- Remove `@askrjs/monaco/testing`, `createMonacoEditorTestDriver`, and
  `MonacoEditorTestDriver` from the published contract. Use Monaco's native edit
  and history APIs in application tests; the repository driver is now private.
- Move `MonacoEditorInstance`, `MonacoTextModel`, `MonacoUri`, and
  `MonacoNamespace` aliases into implementation ownership. Import the native
  editor/model/URI types from `monaco-editor` instead.
- Move `MonacoLoader`, `MonacoBeforeMount`, `MonacoMountHandler`, and
  `MonacoErrorHandler` aliases into implementation ownership. Derive callback
  types from the corresponding `MonacoEditorProps` fields.

### Fixes

- Deliver synchronous loader exceptions to `onError`, matching rejected loaders.
- Ignore obsolete loader completions before they clear the active load, so
  unrelated updates cannot start duplicate loads.
- Release a wrapper-owned model immediately when editor creation fails; preserve
  caller-owned models and allow recovery on a later update.
