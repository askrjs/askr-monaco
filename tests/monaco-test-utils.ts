import type * as Monaco from 'monaco-editor';

export type FakeTextModel = Monaco.editor.ITextModel & {
  disposed: boolean;
  disposeCalls: number;
  languageId: string | undefined;
};

export type FakeEditor = Monaco.editor.IStandaloneCodeEditor & {
  disposed: boolean;
  disposeCalls: number;
  setModelCalls: Array<Monaco.editor.ITextModel | null>;
  updateOptionsCalls: Array<
    Monaco.editor.IEditorOptions & Monaco.editor.IGlobalEditorOptions
  >;
  layoutCalls: Array<Monaco.editor.IDimension | undefined>;
  emitModelContentChange: (value: string) => void;
};

export type FakeCreateCall = {
  host: HTMLElement;
  options: Monaco.editor.IStandaloneEditorConstructionOptions;
  overrideServices: Monaco.editor.IEditorOverrideServices | undefined;
};

function createUri(value: string) {
  return {
    toString: () => value,
  } as Monaco.Uri;
}

function createTextModel(
  value: string,
  language: string | undefined,
  uriText: string,
  onDispose: () => void
) {
  const model = {
    uri: createUri(uriText),
    disposed: false,
    disposeCalls: 0,
    languageId: language,
    getValue: () => currentValue,
    setValue: (nextValue: string | Monaco.editor.ITextSnapshot) => {
      currentValue = typeof nextValue === 'string' ? nextValue : currentValue;
    },
    getLanguageId: () => model.languageId ?? 'plaintext',
    dispose: () => {
      model.disposed = true;
      model.disposeCalls += 1;
      onDispose();
    },
  } as unknown as FakeTextModel;

  let currentValue = value;
  return model;
}

function createEditor(model: Monaco.editor.ITextModel | null) {
  const contentChangeListeners = new Set<
    (event: Monaco.editor.IModelContentChangedEvent) => void
  >();
  const editor = {
    disposed: false,
    disposeCalls: 0,
    setModelCalls: [] as Array<Monaco.editor.ITextModel | null>,
    updateOptionsCalls: [] as Array<
      Monaco.editor.IEditorOptions & Monaco.editor.IGlobalEditorOptions
    >,
    layoutCalls: [] as Array<Monaco.editor.IDimension | undefined>,
    getModel: () => currentModel,
    setModel: (nextModel: Monaco.editor.ITextModel | null) => {
      currentModel = nextModel;
      editor.setModelCalls.push(nextModel);
    },
    updateOptions: (
      nextOptions: Monaco.editor.IEditorOptions &
        Monaco.editor.IGlobalEditorOptions
    ) => {
      editor.updateOptionsCalls.push(nextOptions);
    },
    layout: (dimension?: Monaco.editor.IDimension) => {
      editor.layoutCalls.push(dimension);
    },
    getValue: () => currentModel?.getValue() ?? '',
    saveViewState: () => ({ cursorState: [], viewState: {} }),
    restoreViewState: () => undefined,
    setValue: (nextValue: string) => {
      currentModel?.setValue(nextValue);
    },
    onDidChangeModelContent: (
      listener: (event: Monaco.editor.IModelContentChangedEvent) => void
    ) => {
      contentChangeListeners.add(listener);
      return {
        dispose: () => contentChangeListeners.delete(listener),
      };
    },
    emitModelContentChange: (nextValue: string) => {
      currentModel?.setValue(nextValue);
      const event = {} as Monaco.editor.IModelContentChangedEvent;

      for (const listener of contentChangeListeners) {
        listener(event);
      }
    },
    dispose: () => {
      editor.disposed = true;
      editor.disposeCalls += 1;
      contentChangeListeners.clear();
    },
  } as unknown as FakeEditor;

  let currentModel = model;
  return editor;
}

export function createFakeMonaco() {
  let modelIndex = 0;
  const createdModels: FakeTextModel[] = [];
  const editors: FakeEditor[] = [];
  const createCalls: FakeCreateCall[] = [];
  const themeCalls: string[] = [];
  const modelsByUri = new Map<string, FakeTextModel>();

  const monaco = {
    Uri: {
      parse: (value: string) => createUri(value),
    },
    editor: {
      create: (
        host: HTMLElement,
        options: Monaco.editor.IStandaloneEditorConstructionOptions = {},
        overrideServices?: Monaco.editor.IEditorOverrideServices
      ) => {
        const editor = createEditor(options.model ?? null);
        createCalls.push({ host, options, overrideServices });
        editors.push(editor);
        return editor as Monaco.editor.IStandaloneCodeEditor;
      },
      createModel: (value: string, language?: string, uri?: Monaco.Uri) => {
        const uriText = uri?.toString() ?? `inmemory://model/${++modelIndex}`;
        const model = createTextModel(value, language, uriText, () => {
          modelsByUri.delete(uriText);
        });

        createdModels.push(model);
        modelsByUri.set(uriText, model);
        return model as Monaco.editor.ITextModel;
      },
      setModelLanguage: (
        model: Monaco.editor.ITextModel,
        nextLanguage: string
      ) => {
        (model as FakeTextModel).languageId = nextLanguage;
      },
      setTheme: (theme: string) => {
        themeCalls.push(theme);
      },
      getModel: (uri: Monaco.Uri) => {
        return modelsByUri.get(uri.toString()) ?? null;
      },
    },
  } as unknown as typeof import('monaco-editor');

  return {
    monaco,
    createdModels,
    editors,
    createCalls,
    themeCalls,
  };
}

export function neverLoadMonaco() {
  return new Promise<never>(() => {});
}
