import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import * as monaco from 'monaco-editor';
import type { MonacoEditorInstance } from '../../../../src';
import { MonacoEditor } from '../../../../src';
import { createMonacoEditorTestDriver } from '../../../../src/testing';
import { flushUpdates, mount, unmount } from '../../../test-utils';

describe('MonacoEditor mobile editing', () => {
  let container: HTMLElement | undefined;

  afterEach(() => {
    unmount(container);
    container = undefined;
  });

  it('should replace selections and completions through the model on desktop and touch devices', async () => {
    let editor: MonacoEditorInstance | undefined;
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

    try {
      container = mount(
        <MonacoEditor
          aria-label="SQL editor"
          defaultValue="SELECT stale_value;"
          language="sql"
          monaco={monaco}
          onMount={(mountedEditor) => {
            editor = mountedEditor;
          }}
          options={{
            dimension: { width: 480, height: 180 },
            hideCursorInOverviewRuler: true,
            minimap: { enabled: false },
            occurrencesHighlight: 'off',
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            selectionHighlight: false,
          }}
        />
      );
      await flushUpdates();
      await flushUpdates();
      await flushUpdates();

      const driver = createMonacoEditorTestDriver(editor!);
      const model = editor!.getModel()!;

      driver.selectAll();
      driver.deleteSelection();
      expect(model.getValue()).toBe('');

      driver.replaceAll('SEL');
      editor!.focus();
      driver.trigger('editor.action.triggerSuggest');
      await vi.waitFor(() => {
        expect(
          container?.querySelector('.suggest-widget.visible')
        ).toBeTruthy();
      });
      driver.trigger('acceptSelectedSuggestion');
      await vi.waitFor(() => {
        expect(model.getValue()).toBe('SELECT accounts.id');
      });

      driver.undo();
      await vi.waitFor(() => expect(model.getValue()).toBe('SEL'));
      driver.redo();
      await vi.waitFor(() => {
        expect(model.getValue()).toBe('SELECT accounts.id');
      });

      if (navigator.userAgent.includes('Pixel 7')) {
        expect(navigator.maxTouchPoints).toBeGreaterThan(0);
      }
    } finally {
      completion.dispose();
    }
  });
});
