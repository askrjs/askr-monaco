import type * as Monaco from 'monaco-editor';
import { MonacoEditor } from '../../../src';
import type {
  MonacoEditorInstance,
  MonacoEditorOptions,
  MonacoEditorProps,
  MonacoNamespace,
} from '../../../src';
import { MonacoEditor as MonacoEditorSubpath } from '@askrjs/monaco/monaco-editor';

const options: MonacoEditorOptions = {
  automaticLayout: true,
  readOnly: true,
};

const props: MonacoEditorProps = {
  'aria-label': 'monaco-editor',
  'data-testid': 'monaco-editor',
  defaultValue: 'const answer = 42;',
  editorRef: { current: null as MonacoEditorInstance | null },
  language: 'typescript',
  loadMonaco: async () => await import('monaco-editor'),
  monacoRef: { current: null as MonacoNamespace | null },
  onMount: (editor, monaco) => {
    const model = editor.getModel();
    void model;
    void monaco.editor;
  },
  options,
  path: 'file:///src/example.ts',
  theme: 'vs-dark',
};

const externalModel = null as Monaco.editor.ITextModel | null;

const controlledProps: MonacoEditorProps = {
  'aria-label': 'controlled-monaco-editor',
  model: externalModel,
};

// @ts-expect-error wrapper-owned model configuration lives on dedicated props.
const invalidOptions: MonacoEditorOptions = { model: null };

void props;
void controlledProps;
void MonacoEditor;
void MonacoEditorSubpath;
void invalidOptions;
