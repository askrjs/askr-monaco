# Testing editor interactions

Use Monaco's native editor and model APIs to make editor interaction tests
independent of desktop keyboard mappings. The 0.5 runtime package removes
`@askrjs/monaco/testing`, `createMonacoEditorTestDriver`, and
`MonacoEditorTestDriver`; the repository's driver is a private test helper.

Create controls after `onMount` supplies the live editor. For example:

```ts
import type * as Monaco from 'monaco-editor';

function replaceAll(
  editor: Monaco.editor.IStandaloneCodeEditor,
  value: string
) {
  const model = editor.getModel();
  if (!model) throw new Error('An attached model is required');
  editor.pushUndoStop();
  const applied = editor.executeEdits('application-test', [
    { range: model.getFullModelRange(), text: value, forceMoveMarkers: true },
  ]);
  editor.pushUndoStop();
  if (!applied) throw new Error('The model edit failed');
}

replaceAll(editor, 'SEL');
editor.trigger('application-test', 'editor.action.triggerSuggest', null);
editor.trigger('application-test', 'acceptSelectedSuggestion', null);
editor.trigger('application-test', 'undo', null);
editor.trigger('application-test', 'redo', null);
```

Completion providers and suggestion UI can schedule asynchronous work. Wait for
the application-visible result before accepting a completion, and dispose
registrations you create through `onUnmount`.

Monaco owns keyboard bindings: `Meta` on macOS, `Control` on Windows/Linux.
Touch-device emulation does not imply a physical keyboard. Tests that run on
both desktop and mobile should use the editor API for deterministic edits.
The browser suite exercises selection, deletion, completion, undo, and redo in
desktop Chromium, Pixel 7 emulation, Firefox, and WebKit.
