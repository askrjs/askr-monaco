import type { Ref } from '@askrjs/askr/foundations/utilities';
import type * as Monaco from 'monaco-editor';

/** The `monaco-editor` module namespace, either provided directly or resolved by `loadMonaco`. */
export type MonacoNamespace = typeof import('monaco-editor/editor/editor.api');
/** A live Monaco standalone code editor instance. */
export type MonacoEditorInstance = Monaco.editor.IStandaloneCodeEditor;
/** A Monaco text model backing an editor instance. */
export type MonacoTextModel = Monaco.editor.ITextModel;
/** A Monaco URI, used to identify a text model's path. */
export type MonacoUri = Monaco.Uri;
/** Loader invoked to resolve the Monaco namespace when `monaco` isn't provided directly. */
export type MonacoLoader =
  | (() => MonacoNamespace | PromiseLike<MonacoNamespace>)
  | undefined;
/** Hook run after Monaco loads but before the editor instance is created. */
export type MonacoBeforeMount =
  | ((monaco: MonacoNamespace) => void | PromiseLike<void>)
  | undefined;
/** Handler invoked with the editor and Monaco namespace on mount or unmount. */
export type MonacoMountHandler =
  | ((editor: MonacoEditorInstance, monaco: MonacoNamespace) => void)
  | undefined;
/** Handler invoked when loading Monaco or applying an edit fails. */
export type MonacoErrorHandler = ((error: unknown) => void) | undefined;

/**
 * Monaco standalone editor construction options, excluding the fields that
 * `MonacoEditorProps` manages directly (`model`, `value`, `language`, `theme`).
 */
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
  role?: JSX.IntrinsicElements['div']['role'];
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
