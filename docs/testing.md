# Testing editor interactions

`@askrjs/monaco/testing` provides a small driver for deterministic editor
interaction tests. It edits the real Monaco model through the editor API, so
selection, completion replacement, undo, and redo exercise Monaco's actual
editing and history behavior without depending on browser-specific key events.

```ts
import { createMonacoEditorTestDriver } from '@askrjs/monaco/testing';

const driver = createMonacoEditorTestDriver(editor);

driver.selectAll();
driver.deleteSelection();
driver.replaceAll('SEL');
driver.trigger('editor.action.triggerSuggest');
driver.trigger('acceptSelectedSuggestion');
driver.undo();
driver.redo();
```

Create the driver after `onMount` supplies the editor instance. Completion
providers and suggestion UI can schedule asynchronous work, so wait for the
application-visible result before accepting a completion.

## Primary modifier contract

Monaco owns keyboard bindings. The primary modifier is `Meta` on macOS and
`Control` on Windows and Linux. Touch-device emulation does not imply a
physical keyboard or a primary-modifier mapping, so tests that must run on both
desktop Chromium and an emulated mobile device should use the driver instead of
synthesizing `Control+A` or `Meta+A`.

The browser suite runs the same selection, deletion, completion, undo, and redo
contract in desktop Chromium, Pixel 7 emulation, Firefox, and WebKit.
