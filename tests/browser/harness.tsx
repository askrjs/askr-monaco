import axe from 'axe-core';
import * as monaco from 'monaco-editor';
import { state } from '@askrjs/askr';
import type { MonacoEditorInstance, MonacoEditorOptions } from '../../src';
import { MonacoEditor } from '../../src';
import { createMonacoEditorTestDriver } from '../../src/testing';
import {
  createFakeMonaco,
  neverLoadMonaco,
  type FakeEditor,
} from '../monaco-test-utils';
import { flushUpdates, mount, resetTestState, unmount } from '../test-utils';
import '../setup';

export type Harness = ReturnType<typeof createHarness>;

declare global {
  interface Window {
    askrMonaco: Harness;
  }
}

const editorOptions: MonacoEditorOptions = {
  dimension: { width: 480, height: 180 },
  hideCursorInOverviewRuler: true,
  minimap: { enabled: false },
  overviewRulerBorder: false,
  overviewRulerLanes: 0,
};

const historyOptions: MonacoEditorOptions = {
  ...editorOptions,
  occurrencesHighlight: 'off',
  selectionHighlight: false,
};

function longValue(prefix: string) {
  return Array.from(
    { length: 80 },
    (_, index) => `${prefix} ${index + 1}`
  ).join('\n');
}

function registerSqlCompletion() {
  return monaco.languages.registerCompletionItemProvider('sql', {
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
}

async function settle() {
  await flushUpdates();
  await flushUpdates();
  await flushUpdates();
}

function normalizeDeterministicMarkup(html: string) {
  return html.replace(/ data-key="Symbol\(AskrContext[^"]*\)"/g, '');
}

function renderHtml(element: JSX.Element) {
  resetTestState();
  const container = mount(element);

  try {
    return container.innerHTML;
  } finally {
    unmount(container);
  }
}

function createHarness() {
  let container: HTMLElement | undefined;

  /** Shared state for the multi-step real-Monaco scenarios. */
  let editor: MonacoEditorInstance | undefined;
  let pinnedEditor: MonacoEditorInstance | undefined;
  let model: monaco.editor.ITextModel | undefined;
  let driver: ReturnType<typeof createMonacoEditorTestDriver> | undefined;
  let completion: monaco.IDisposable | undefined;
  let unmountCalls = 0;
  let updateValue: ((value: string) => void) | undefined;

  /** Shared state for the fake-Monaco scenarios. */
  let fakeEditors: FakeEditor[] = [];
  let focusTarget: HTMLTextAreaElement | undefined;
  let focusHost: Element | undefined;

  function teardown() {
    completion?.dispose();
    completion = undefined;
    unmount(container);
    container = undefined;
    editor = undefined;
    pinnedEditor = undefined;
    model = undefined;
    driver = undefined;
    updateValue = undefined;
    fakeEditors = [];
    focusTarget = undefined;
    focusHost = undefined;
    unmountCalls = 0;
  }

  return {
    teardown,

    /* ---------------------------------------------------------------- */
    /* Determinism                                                      */
    /* ---------------------------------------------------------------- */

    determinismRenders() {
      const factory = () => (
        <MonacoEditor
          aria-label="Monaco editor host"
          loadMonaco={neverLoadMonaco}
        />
      );

      return {
        first: normalizeDeterministicMarkup(renderHtml(factory())),
        second: normalizeDeterministicMarkup(renderHtml(factory())),
      };
    },

    /* ---------------------------------------------------------------- */
    /* Accessibility                                                    */
    /* ---------------------------------------------------------------- */

    async axeViolations() {
      const fake = createFakeMonaco();
      container = mount(
        <MonacoEditor aria-label="Monaco editor host" monaco={fake.monaco} />
      );

      try {
        const results = await axe.run(container);
        return results.violations.map(
          (violation) => `${violation.id}: ${violation.description}`
        );
      } finally {
        unmount(container);
        container = undefined;
      }
    },

    /* ---------------------------------------------------------------- */
    /* Behavior (fake Monaco)                                           */
    /* ---------------------------------------------------------------- */

    async lazyLoad() {
      const fake = createFakeMonaco();
      let loadMonacoCalls = 0;
      const loadMonaco = async () => {
        loadMonacoCalls += 1;
        return fake.monaco;
      };

      container = mount(
        <MonacoEditor aria-label="Monaco editor" loadMonaco={loadMonaco} />
      );
      await settle();

      return {
        hasHost: Boolean(container.querySelector('[data-askr-monaco-editor]')),
        loadMonacoCalls,
        createCalls: fake.createCalls.length,
      };
    },

    async focusPreservationSetup() {
      const fake = createFakeMonaco();
      fakeEditors = fake.editors;

      function FocusHarness() {
        const value = state('SELECT 1;');

        return (
          <MonacoEditor
            aria-label="SQL editor"
            monaco={fake.monaco}
            onMount={(mountedEditor) => {
              mountedEditor.onDidChangeModelContent(() => {
                value.set(mountedEditor.getValue());
              });
            }}
            value={value()}
          />
        );
      }

      container = mount(<FocusHarness />);
      await settle();

      focusHost = container.querySelector('[data-askr-monaco-editor]')!;
      focusTarget = document.createElement('textarea');
      focusHost.appendChild(focusTarget);
      focusTarget.focus();

      return { createCalls: fake.createCalls.length };
    },

    async focusPreservationAfterContentChange() {
      fakeEditors[0].emitModelContentChange('SELECT 12;');
      await settle();

      return {
        sameHost:
          container!.querySelector('[data-askr-monaco-editor]') === focusHost,
        textareaIsFirstChild: focusHost!.firstChild === focusTarget,
        textareaFocused: document.activeElement === focusTarget,
        createCalls: fakeEditors.length,
        value: fakeEditors[0].getValue(),
      };
    },

    /* ---------------------------------------------------------------- */
    /* Real Monaco integration - controlled updates                     */
    /* ---------------------------------------------------------------- */

    async controlledUpdatesSetup() {
      function Harness() {
        const value = state(longValue('line'));

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
            options={editorOptions}
            value={value()}
          />
        );
      }

      container = mount(<Harness />);
      await settle();

      const mountedEditor = editor!;
      model = mountedEditor.getModel()!;
      mountedEditor.setSelection(new monaco.Selection(40, 2, 40, 5));
      mountedEditor.setScrollTop(500);
      mountedEditor.focus();

      model.applyEdits([
        { range: new monaco.Range(80, 8, 80, 8), text: ' updated' },
      ]);
      await settle();

      return {
        sameEditor: editor === mountedEditor,
        sameModel: mountedEditor.getModel() === model,
        hasTextFocus: mountedEditor.hasTextFocus(),
        selection: mountedEditor.getSelection()?.toString(),
        expectedSelection: new monaco.Selection(40, 2, 40, 5).toString(),
        scrollTop: mountedEditor.getScrollTop(),
        value: model.getValue(),
      };
    },

    /* ---------------------------------------------------------------- */
    /* Real Monaco integration - external value synchronization         */
    /* ---------------------------------------------------------------- */

    async externalValueSetup() {
      function Harness() {
        const value = state(longValue('line'));
        updateValue = value.set;

        return (
          <MonacoEditor
            aria-label="SQL editor"
            monaco={monaco}
            onMount={(mountedEditor) => {
              editor = mountedEditor;
            }}
            options={editorOptions}
            value={value()}
          />
        );
      }

      container = mount(<Harness />);
      await settle();

      const mountedEditor = editor!;
      model = mountedEditor.getModel()!;
      mountedEditor.setSelection(new monaco.Selection(40, 2, 40, 5));
      mountedEditor.setScrollTop(500);
      mountedEditor.focus();

      updateValue!(longValue('updated'));
      await settle();

      return {
        sameEditor: editor === mountedEditor,
        sameModel: mountedEditor.getModel() === model,
        hasTextFocus: mountedEditor.hasTextFocus(),
        selection: mountedEditor.getSelection()?.toString(),
        expectedSelection: new monaco.Selection(40, 2, 40, 5).toString(),
        scrollTop: mountedEditor.getScrollTop(),
        value: model.getValue(),
      };
    },

    /* ---------------------------------------------------------------- */
    /* Real Monaco integration - selection, completion, history         */
    /* ---------------------------------------------------------------- */

    async historySetup() {
      completion = registerSqlCompletion();

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
            options={historyOptions}
            value={value()}
          />
        );
      }

      container = mount(<Harness />);
      await settle();

      pinnedEditor = editor;
      model = editor!.getModel()!;
      driver = createMonacoEditorTestDriver(editor!);
      editor!.focus();
      driver.selectAll();
    },

    async afterBackspace() {
      await flushUpdates();
      await flushUpdates();

      return {
        sameEditor: editor === pinnedEditor,
        sameModel: editor!.getModel() === model,
        hasTextFocus: editor!.hasTextFocus(),
        value: model!.getValue(),
      };
    },

    async replaceAll(value: string) {
      driver!.replaceAll(value);
      await flushUpdates();

      return {
        sameEditor: editor === pinnedEditor,
        sameModel: editor!.getModel() === model,
        hasTextFocus: editor!.hasTextFocus(),
        unmountCalls,
      };
    },

    trigger(actionId: string) {
      driver!.trigger(actionId);
    },

    suggestWidgetState() {
      return {
        visible: Boolean(container?.querySelector('.suggest-widget.visible')),
        focusedRow: Boolean(
          container?.querySelector(
            '.suggest-widget.visible .monaco-list-row.focused'
          )
        ),
      };
    },

    /* ---------------------------------------------------------------- */
    /* Real Monaco - mobile editing (driver only, no keyboard events)   */
    /* ---------------------------------------------------------------- */

    async mobileEditingSetup() {
      completion = registerSqlCompletion();

      container = mount(
        <MonacoEditor
          aria-label="SQL editor"
          defaultValue="SELECT stale_value;"
          language="sql"
          monaco={monaco}
          onMount={(mountedEditor) => {
            editor = mountedEditor;
          }}
          options={historyOptions}
        />
      );
      await settle();

      pinnedEditor = editor;
      driver = createMonacoEditorTestDriver(editor!);
      model = editor!.getModel()!;

      driver.selectAll();
      driver.deleteSelection();

      return { value: model.getValue() };
    },

    focusEditor() {
      editor!.focus();
    },

    /* ---------------------------------------------------------------- */
    /* Shared probes                                                    */
    /* ---------------------------------------------------------------- */

    undo() {
      driver!.undo();
    },

    redo() {
      driver!.redo();
    },

    modelValue() {
      return model!.getValue();
    },

    liveState() {
      return {
        sameEditor: editor === pinnedEditor,
        sameModel: editor!.getModel() === model,
        unmountCalls,
      };
    },

    touchProfile() {
      return {
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints,
      };
    },
  };
}

window.askrMonaco = createHarness();
