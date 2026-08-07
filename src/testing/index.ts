import type {
  MonacoEditorInstance,
  MonacoTextModel,
} from '../components/monaco-editor/monaco-editor.types';

const TEST_EDIT_SOURCE = '@askrjs/monaco/testing';

export interface MonacoEditorTestDriver {
  /** Select the complete model without relying on a platform modifier key. */
  selectAll(): void;
  /** Delete the current selection through Monaco's edit stack. */
  deleteSelection(): void;
  /** Replace the complete model through Monaco's edit stack. */
  replaceAll(value: string): void;
  /** Invoke Monaco's undo command. */
  undo(): void;
  /** Invoke Monaco's redo command. */
  redo(): void;
  /** Invoke any Monaco editor command, including completion commands. */
  trigger(actionId: string, payload?: unknown): void;
}

function requireModel(editor: MonacoEditorInstance): MonacoTextModel {
  const model = editor.getModel();
  if (!model) {
    throw new Error(
      '@askrjs/monaco/testing requires an editor with an attached model.'
    );
  }
  return model;
}

function applyEdit(
  editor: MonacoEditorInstance,
  range: Parameters<MonacoEditorInstance['executeEdits']>[1][number]['range'],
  value: string
): void {
  editor.pushUndoStop();
  const applied = editor.executeEdits(TEST_EDIT_SOURCE, [
    { range, text: value, forceMoveMarkers: true },
  ]);
  editor.pushUndoStop();
  if (!applied) {
    throw new Error('@askrjs/monaco/testing could not apply the model edit.');
  }
}

/**
 * Create deterministic test controls for model edits and editor commands.
 * These controls bypass host keyboard mapping but still use Monaco's model and
 * undo stack.
 */
export function createMonacoEditorTestDriver(
  editor: MonacoEditorInstance
): MonacoEditorTestDriver {
  return {
    selectAll() {
      editor.setSelection(requireModel(editor).getFullModelRange());
    },

    deleteSelection() {
      const model = requireModel(editor);
      const selection = editor.getSelection() ?? model.getFullModelRange();
      const offset = model.getOffsetAt(selection.getStartPosition());
      applyEdit(editor, selection, '');
      editor.setPosition(model.getPositionAt(offset));
    },

    replaceAll(value: string) {
      const model = requireModel(editor);
      applyEdit(editor, model.getFullModelRange(), value);
      editor.setPosition(model.getPositionAt(value.length));
    },

    undo() {
      editor.trigger(TEST_EDIT_SOURCE, 'undo', null);
    },

    redo() {
      editor.trigger(TEST_EDIT_SOURCE, 'redo', null);
    },

    trigger(actionId: string, payload: unknown = null) {
      editor.trigger(TEST_EDIT_SOURCE, actionId, payload);
    },
  };
}
