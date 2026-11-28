import { renderMonacoEditor } from './components/monaco-editor/monaco-editor';
import type {
  MonacoEditorProps as BaseProps,
  MonacoLoader,
  MonacoNamespace,
} from './components/monaco-editor/monaco-editor.types';

export type { MonacoEditorOptions } from './components/monaco-editor/monaco-editor.types';

export type MonacoEditorProps = BaseProps &
  ({ monaco: MonacoNamespace } | { loadMonaco: NonNullable<MonacoLoader> });

function missingMonaco(): never {
  throw new Error('@askrjs/monaco/explicit: pass monaco or loadMonaco.');
}

/** Mount Monaco with an application-supplied namespace or loader. */
export function MonacoEditor(props: MonacoEditorProps) {
  return renderMonacoEditor(props, missingMonaco);
}
