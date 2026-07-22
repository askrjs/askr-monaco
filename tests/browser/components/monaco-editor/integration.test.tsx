import { afterEach, describe, expect, it } from 'vite-plus/test';
import { state } from '@askrjs/askr';
import * as monaco from 'monaco-editor';
import type { MonacoEditorInstance } from '../../../../src';
import { MonacoEditor } from '../../../../src';
import { flushUpdates, mount, unmount } from '../../../test-utils';

describe('MonacoEditor - real Monaco integration', () => {
  let container: HTMLElement | undefined;

  afterEach(() => {
    unmount(container);
    container = undefined;
  });

  it('preserves the editor, model, focus, and view state through controlled updates', async () => {
    let editor: MonacoEditorInstance | undefined;

    function Harness() {
      const value = state(
        Array.from({ length: 80 }, (_, index) => `line ${index + 1}`).join(
          '\n'
        )
      );

      return (
        <MonacoEditor
          aria-label="SQL editor"
          monaco={monaco}
          onMount={(mountedEditor) => {
            editor = mountedEditor;
            mountedEditor.onDidChangeModelContent(() => {
              value.set(mountedEditor.getValue());
            });
          }}
          options={{
            dimension: { width: 480, height: 180 },
            hideCursorInOverviewRuler: true,
            minimap: { enabled: false },
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
          }}
          value={value()}
        />
      );
    }

    container = mount(<Harness />);
    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    const mountedEditor = editor!;
    const model = mountedEditor.getModel()!;
    mountedEditor.setSelection(new monaco.Selection(40, 2, 40, 5));
    mountedEditor.setScrollTop(500);
    mountedEditor.focus();

    model.applyEdits([
      {
        range: new monaco.Range(80, 8, 80, 8),
        text: ' updated',
      },
    ]);
    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(editor).toBe(mountedEditor);
    expect(mountedEditor.getModel()).toBe(model);
    expect(mountedEditor.hasTextFocus()).toBe(true);
    expect(mountedEditor.getSelection()).toEqual(
      new monaco.Selection(40, 2, 40, 5)
    );
    expect(mountedEditor.getScrollTop()).toBeGreaterThan(0);
    expect(model.getValue()).toContain('line 80 updated');
  });

  it('synchronizes an external value without replacing the editor or view state', async () => {
    let editor: MonacoEditorInstance | undefined;
    let updateValue: ((value: string) => void) | undefined;

    function Harness() {
      const value = state(
        Array.from({ length: 80 }, (_, index) => `line ${index + 1}`).join(
          '\n'
        )
      );
      updateValue = value.set;

      return (
        <MonacoEditor
          aria-label="SQL editor"
          monaco={monaco}
          onMount={(mountedEditor) => {
            editor = mountedEditor;
          }}
          options={{
            dimension: { width: 480, height: 180 },
            hideCursorInOverviewRuler: true,
            minimap: { enabled: false },
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
          }}
          value={value()}
        />
      );
    }

    container = mount(<Harness />);
    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    const mountedEditor = editor!;
    const model = mountedEditor.getModel()!;
    mountedEditor.setSelection(new monaco.Selection(40, 2, 40, 5));
    mountedEditor.setScrollTop(500);
    mountedEditor.focus();

    updateValue!(
      Array.from({ length: 80 }, (_, index) => `updated ${index + 1}`).join(
        '\n'
      )
    );
    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(editor).toBe(mountedEditor);
    expect(mountedEditor.getModel()).toBe(model);
    expect(mountedEditor.hasTextFocus()).toBe(true);
    expect(mountedEditor.getSelection()).toEqual(
      new monaco.Selection(40, 2, 40, 5)
    );
    expect(mountedEditor.getScrollTop()).toBeGreaterThan(0);
    expect(model.getValue()).toContain('updated 80');
  });
});
