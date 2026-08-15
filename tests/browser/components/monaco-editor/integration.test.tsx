import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from '@vitest/browser/context';
import { state } from '@askrjs/askr';
import * as monaco from 'monaco-editor';
import type {
  MonacoEditorInstance,
  MonacoEditorOptions,
} from '../../../../src';
import { MonacoEditor } from '../../../../src';
import { createMonacoEditorTestDriver } from '../../../../src/testing';
import { flushUpdates, mount, unmount } from '../../../test-utils';

describe('MonacoEditor - real Monaco integration', () => {
  let container: HTMLElement | undefined;

  afterEach(() => {
    unmount(container);
    container = undefined;
  });

  it('should preserve the editor, model, focus, and view state through controlled updates', async () => {
    let editor: MonacoEditorInstance | undefined;

    function Harness() {
      const value = state(
        Array.from({ length: 80 }, (_, index) => `line ${index + 1}`).join('\n')
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

  it('should preserve selection, completion, and history through controlled parent rerenders', async () => {
    let editor: MonacoEditorInstance | undefined;
    let unmountCalls = 0;
    const options: MonacoEditorOptions = {
      dimension: { width: 480, height: 180 },
      hideCursorInOverviewRuler: true,
      minimap: { enabled: false },
      occurrencesHighlight: 'off',
      overviewRulerBorder: false,
      overviewRulerLanes: 0,
      selectionHighlight: false,
    };
    const completion = monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems(model, position) {
        const word = model.getWordUntilPosition(position);
        return {
          suggestions: [
            {
              label: 'SELECT accounts.id',
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: 'SELECT accounts.id',
              range: new monaco.Range(
                position.lineNumber,
                word.startColumn,
                position.lineNumber,
                word.endColumn
              ),
            },
          ],
        };
      },
    });

    function Harness() {
      const value = state('SELECT stale_value;');

      return (
        <MonacoEditor
          aria-label="SQL editor"
          language="sql"
          monaco={monaco}
          onMount={(mountedEditor) => {
            editor = mountedEditor;
            mountedEditor.onDidChangeModelContent(() => {
              value.set(mountedEditor.getValue());
            });
          }}
          onUnmount={() => {
            unmountCalls += 1;
          }}
          options={options}
          value={value()}
        />
      );
    }

    try {
      container = mount(<Harness />);
      await flushUpdates();
      await flushUpdates();
      await flushUpdates();

      const mountedEditor = editor!;
      const model = mountedEditor.getModel()!;
      const driver = createMonacoEditorTestDriver(mountedEditor);
      mountedEditor.focus();

      driver.selectAll();
      await userEvent.keyboard('{Backspace}');
      await flushUpdates();
      await flushUpdates();
      expect(editor).toBe(mountedEditor);
      expect(mountedEditor.getModel()).toBe(model);
      expect(mountedEditor.hasTextFocus()).toBe(true);
      expect(model.getValue()).toBe('');

      driver.replaceAll('SEL');
      await flushUpdates();
      expect(editor).toBe(mountedEditor);
      expect(mountedEditor.getModel()).toBe(model);
      expect(mountedEditor.hasTextFocus()).toBe(true);
      expect(unmountCalls).toBe(0);
      driver.trigger('editor.action.triggerSuggest');
      await vi.waitFor(() => {
        expect(
          container?.querySelector('.suggest-widget.visible')
        ).toBeTruthy();
        expect(
          container?.querySelector(
            '.suggest-widget.visible .monaco-list-row.focused'
          )
        ).toBeTruthy();
      });
      driver.trigger('acceptSelectedSuggestion');
      expect(editor).toBe(mountedEditor);
      expect(mountedEditor.getModel()).toBe(model);
      expect(unmountCalls).toBe(0);
      await vi.waitFor(() => {
        expect(model.getValue()).toBe('SELECT accounts.id');
      });

      driver.undo();
      await vi.waitFor(() => expect(model.getValue()).toBe('SEL'));
      driver.redo();
      await vi.waitFor(() =>
        expect(model.getValue()).toBe('SELECT accounts.id')
      );
      expect(editor).toBe(mountedEditor);
      expect(unmountCalls).toBe(0);
    } finally {
      completion.dispose();
    }
  });

  it('should synchronize an external value without replacing the editor or view state', async () => {
    let editor: MonacoEditorInstance | undefined;
    let updateValue: ((value: string) => void) | undefined;

    function Harness() {
      const value = state(
        Array.from({ length: 80 }, (_, index) => `line ${index + 1}`).join('\n')
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
