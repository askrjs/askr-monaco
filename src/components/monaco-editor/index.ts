import { renderMonacoEditor } from './monaco-editor';
import type { MonacoEditorProps } from './monaco-editor.types';

function loadDefaultMonaco() {
  return import('monaco-editor');
}

export function MonacoEditor(props: MonacoEditorProps) {
  return renderMonacoEditor(props, loadDefaultMonaco);
}

export type {
  MonacoEditorOptions,
  MonacoEditorProps,
} from './monaco-editor.types';
