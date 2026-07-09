import type { Ref } from '@askrjs/askr/foundations/utilities';
import type * as Monaco from 'monaco-editor';

export type MonacoNamespace = typeof import('monaco-editor');
export type MonacoEditorInstance = Monaco.editor.IStandaloneCodeEditor;
export type MonacoTextModel = Monaco.editor.ITextModel;
export type MonacoUri = Monaco.Uri;
export type MonacoLoader =
  | (() => MonacoNamespace | PromiseLike<MonacoNamespace>)
  | undefined;
export type MonacoBeforeMount =
  | ((monaco: MonacoNamespace) => void | PromiseLike<void>)
  | undefined;
export type MonacoMountHandler =
  | ((editor: MonacoEditorInstance, monaco: MonacoNamespace) => void)
  | undefined;
export type MonacoErrorHandler = ((error: unknown) => void) | undefined;

export type MonacoEditorOptions = Omit<
  Monaco.editor.IStandaloneEditorConstructionOptions,
  'model' | 'value' | 'language' | 'theme'
>;

/**
 * Thin Askr host for Monaco's standalone editor.
 *
 * Pass raw Monaco `options` and, when needed, provide an external `model`
 * to keep full access to Monaco's language services, providers, and editor APIs.
 */
export type MonacoEditorProps = Omit<
  JSX.IntrinsicElements['div'],
  'children' | 'ref'
> & {
  ref?: Ref<HTMLDivElement>;
  children?: never;
  options?: MonacoEditorOptions;
  overrideServices?: Monaco.editor.IEditorOverrideServices;
  model?: MonacoTextModel | null;
  value?: string;
  defaultValue?: string;
  language?: string;
  path?: string | MonacoUri;
  theme?: string;
  monaco?: MonacoNamespace;
  loadMonaco?: MonacoLoader;
  beforeMount?: MonacoBeforeMount;
  onMount?: MonacoMountHandler;
  onUnmount?: MonacoMountHandler;
  onError?: MonacoErrorHandler;
  editorRef?: Ref<MonacoEditorInstance>;
  monacoRef?: Ref<MonacoNamespace>;
};
