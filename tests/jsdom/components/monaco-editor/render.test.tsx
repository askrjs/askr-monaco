import { state } from '@askrjs/askr';
import type { JSX } from '@askrjs/askr/jsx-runtime';
import type { MonacoEditorProps } from '../../../../src';
import type {
  MonacoEditorInstance,
  MonacoNamespace,
} from '../../../../src/components/monaco-editor/monaco-editor.types';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { MonacoEditor } from '../../../../src';
import { updateImperativeHost } from '../../../../src/components/monaco-editor/imperative-host';
import { createFakeMonaco } from '../../../monaco-test-utils';
import { mount, unmount } from '../../../test-utils';
import { flushUpdates } from '../../../test-utils';

describe('MonacoEditor - jsdom', () => {
  let container: HTMLElement | undefined;
  let extraContainers: HTMLElement[] = [];

  afterEach(() => {
    for (const current of [...extraContainers].reverse()) {
      unmount(current);
    }

    extraContainers = [];
    unmount(container);
    container = undefined;
  });

  function mountExtra(element: JSX.Element) {
    const nextContainer = mount(element);
    extraContainers.push(nextContainer);
    return nextContainer;
  }

  function unmountExtra(current: HTMLElement) {
    unmount(current);
    extraContainers = extraContainers.filter((item) => item !== current);
  }

  it('should retain the imperative host across a transient callback-ref detach', () => {
    const host = document.createElement('div');
    const replacement = document.createElement('div');
    const owner = { host: host as HTMLDivElement | null };
    const disposeForHostChange = vi.fn();

    expect(updateImperativeHost(owner, null, disposeForHostChange)).toBe(false);
    expect(owner.host).toBe(host);
    expect(disposeForHostChange).not.toHaveBeenCalled();

    expect(updateImperativeHost(owner, host, disposeForHostChange)).toBe(true);
    expect(owner.host).toBe(host);
    expect(disposeForHostChange).not.toHaveBeenCalled();

    expect(updateImperativeHost(owner, replacement, disposeForHostChange)).toBe(
      true
    );
    expect(owner.host).toBe(replacement);
    expect(disposeForHostChange).toHaveBeenCalledTimes(1);
  });

  it('should create a Monaco editor with raw options and lifecycle hooks', async () => {
    const fake = createFakeMonaco();
    const beforeMount = vi.fn();
    const onMount = vi.fn();
    const hostRef = { current: null as HTMLDivElement | null };
    const editorRef = { current: null as MonacoEditorInstance | null };
    const monacoRef = { current: null as MonacoNamespace | null };

    container = mount(
      <MonacoEditor
        aria-label="Monaco editor"
        beforeMount={beforeMount}
        editorRef={editorRef}
        monaco={fake.monaco}
        monacoRef={monacoRef}
        onMount={onMount}
        options={{ automaticLayout: true, readOnly: true }}
        path="file:///src/example.ts"
        ref={hostRef}
        value="const answer = 42;"
        language="typescript"
      />
    );

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(container.querySelector('[data-askr-monaco-editor]')).toBeTruthy();
    expect(beforeMount).toHaveBeenCalledWith(fake.monaco);
    expect(onMount).toHaveBeenCalledWith(fake.editors[0], fake.monaco);
    expect(hostRef.current).toBe(container.firstElementChild);
    expect(editorRef.current).toBe(fake.editors[0]);
    expect(monacoRef.current).toBe(fake.monaco);
    expect(fake.createCalls).toHaveLength(1);
    expect(fake.createCalls[0].options.readOnly).toBe(true);
    expect(fake.createdModels).toHaveLength(1);
    expect(fake.createdModels[0].getValue()).toBe('const answer = 42;');
    expect(fake.createdModels[0].getLanguageId()).toBe('typescript');
  });

  it('should update the live editor without recreating it for mutable props', async () => {
    const fake = createFakeMonaco();
    const initialProps: MonacoEditorProps = {
      'aria-label': 'Monaco editor',
      monaco: fake.monaco,
      options: { readOnly: false },
      theme: 'vs',
      value: 'const start = 1;',
      language: 'typescript',
      path: 'file:///src/start.ts',
    };
    let setProps!: (
      updater: (prev: MonacoEditorProps) => MonacoEditorProps
    ) => void;

    function Harness() {
      const propsState = state<MonacoEditorProps>(initialProps);
      setProps = propsState.set;
      return <MonacoEditor {...propsState()} />;
    }

    container = mount(<Harness />);

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    setProps((prev) => ({
      ...prev,
      options: {
        dimension: { width: 640, height: 360 },
        minimap: { enabled: false },
        readOnly: true,
      },
      theme: 'vs-dark',
      value: 'const next = 2;',
      language: 'javascript',
    }));

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(fake.createCalls).toHaveLength(1);
    expect(fake.editors[0].updateOptionsCalls).toEqual([
      {
        minimap: { enabled: false },
        readOnly: true,
      },
    ]);
    expect(fake.editors[0].layoutCalls).toEqual([{ width: 640, height: 360 }]);
    expect(fake.themeCalls).toEqual(['vs', 'vs-dark']);
    expect(fake.createdModels).toHaveLength(1);
    expect(fake.editors[0].getValue()).toBe('const next = 2;');
    expect(fake.editors[0].getModel()?.getLanguageId()).toBe('javascript');
  });

  it('should expose Monaco theme changes as namespace-global across instances', async () => {
    const fake = createFakeMonaco();
    container = mount(
      <MonacoEditor
        aria-label="Dark editor"
        monaco={fake.monaco}
        theme="vs-dark"
        value="dark"
      />
    );
    mountExtra(
      <MonacoEditor
        aria-label="Light editor"
        monaco={fake.monaco}
        theme="vs-light"
        value="light"
      />
    );
    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(fake.editors).toHaveLength(2);
    expect(fake.themeCalls).toEqual(['vs-dark', 'vs-light']);
  });

  it('should dispose each wrapper-owned model exactly once during rapid path replacement', async () => {
    const fake = createFakeMonaco();
    let setPath!: (path: string) => void;
    function Harness() {
      const path = state('file:///src/0.ts');
      setPath = path.set;
      return (
        <MonacoEditor
          aria-label="Path editor"
          monaco={fake.monaco}
          path={path()}
          value="value"
        />
      );
    }
    container = mount(<Harness />);
    await flushUpdates();
    await flushUpdates();
    for (let index = 1; index <= 8; index += 1) {
      setPath(`file:///src/${index}.ts`);
      await flushUpdates();
      await flushUpdates();
    }

    expect(fake.createdModels).toHaveLength(9);
    expect(
      fake.createdModels.slice(0, -1).every((model) => model.disposeCalls === 1)
    ).toBe(true);
    expect(
      fake.createdModels[fake.createdModels.length - 1]?.disposeCalls
    ).toBe(0);
    expect(fake.editors[0].disposed).toBe(false);
  });

  it('should keep the editor mounted when its change event updates controlled parent state', async () => {
    const fake = createFakeMonaco();

    function Harness() {
      const value = state('SELECT 1;');

      return (
        <MonacoEditor
          aria-label="SQL editor"
          language="sql"
          monaco={fake.monaco}
          onMount={(editor) => {
            editor.onDidChangeModelContent(() => {
              value.set(editor.getValue());
            });
          }}
          options={{ automaticLayout: true }}
          value={value()}
        />
      );
    }

    container = mount(<Harness />);

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    const host = container.querySelector('[data-askr-monaco-editor]');
    const editor = fake.editors[0];
    const model = fake.createdModels[0];
    const imperativeChild = document.createElement('div');
    imperativeChild.dataset.monacoView = 'true';
    host?.appendChild(imperativeChild);
    imperativeChild.tabIndex = 0;
    imperativeChild.focus();

    editor.emitModelContentChange('SELECT 12;');

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(host?.isConnected).toBe(true);
    expect(container.querySelector('[data-askr-monaco-editor]')).toBe(host);
    expect(host?.contains(imperativeChild)).toBe(true);
    expect(document.activeElement).toBe(imperativeChild);
    expect(fake.createCalls).toHaveLength(1);
    expect(editor.disposed).toBe(false);
    expect(model.disposed).toBe(false);
    expect(editor.getValue()).toBe('SELECT 12;');
  });

  it('should preserve Monaco DOM across rapid updates and controlled normalization', async () => {
    const fake = createFakeMonaco();

    function Harness() {
      const value = state('SELECT 1;');
      const revision = state(0);

      return (
        <MonacoEditor
          aria-label="SQL editor"
          data-revision={revision()}
          monaco={fake.monaco}
          onMount={(editor) => {
            editor.onDidChangeModelContent(() => {
              value.set(editor.getValue().trim());
              revision.set((current) => current + 1);
            });
          }}
          value={value()}
        />
      );
    }

    container = mount(<Harness />);

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    const host = container.querySelector('[data-askr-monaco-editor]');
    const imperativeChild = document.createElement('div');
    host?.appendChild(imperativeChild);

    fake.editors[0].emitModelContentChange(' SELECT 2; ');
    fake.editors[0].emitModelContentChange(' SELECT 3; ');

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(host?.contains(imperativeChild)).toBe(true);
    expect(host?.querySelectorAll('div')).toHaveLength(1);
    expect(host?.getAttribute('data-revision')).toBe('2');
    expect(fake.createCalls).toHaveLength(1);
    expect(fake.editors[0].getValue()).toBe('SELECT 3;');
  });

  it('should still dispose Monaco exactly once after an update and real unmount', async () => {
    const fake = createFakeMonaco();
    const hostRef = { current: null as HTMLDivElement | null };
    const editorRef = { current: null as MonacoEditorInstance | null };
    const monacoRef = { current: null as MonacoNamespace | null };
    const disposeRegistration = vi.fn();
    const onUnmount = vi.fn(() => disposeRegistration());

    function Harness() {
      const value = state('SELECT 1;');

      return (
        <MonacoEditor
          aria-label="SQL editor"
          editorRef={editorRef}
          monaco={fake.monaco}
          monacoRef={monacoRef}
          onMount={(editor) => {
            const registration = editor.onDidChangeModelContent(() => {
              value.set(editor.getValue());
            });
            disposeRegistration.mockImplementation(() =>
              registration.dispose()
            );
          }}
          onUnmount={onUnmount}
          ref={hostRef}
          value={value()}
        />
      );
    }

    container = mount(<Harness />);

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    const host = container.querySelector('[data-askr-monaco-editor]');
    const imperativeChild = document.createElement('div');
    host?.appendChild(imperativeChild);
    expect(hostRef.current).toBe(host);
    expect(editorRef.current).toBe(fake.editors[0]);
    expect(monacoRef.current).toBe(fake.monaco);

    fake.editors[0].emitModelContentChange('SELECT 2;');
    unmount(container);
    container = undefined;

    await flushUpdates();
    await flushUpdates();

    expect(host?.isConnected).toBe(false);
    expect(fake.editors[0].disposeCalls).toBe(1);
    expect(fake.createdModels[0].disposeCalls).toBe(1);
    expect(onUnmount).toHaveBeenCalledTimes(1);
    expect(disposeRegistration).toHaveBeenCalledTimes(1);
    expect(hostRef.current).toBeNull();
    expect(editorRef.current).toBeNull();
    expect(monacoRef.current).toBeNull();
  });

  it('should keep external models owned by the caller and dispose internal ones', async () => {
    const fake = createFakeMonaco();
    const externalFirst = fake.monaco.editor.createModel(
      'first',
      'typescript',
      fake.monaco.Uri.parse('file:///src/first.ts')
    );
    const externalSecond = fake.monaco.editor.createModel(
      'second',
      'typescript',
      fake.monaco.Uri.parse('file:///src/second.ts')
    );
    const onUnmount = vi.fn();
    let setProps!: (
      updater: (prev: MonacoEditorProps) => MonacoEditorProps
    ) => void;

    function Harness() {
      const propsState = state<MonacoEditorProps>({
        'aria-label': 'Monaco editor',
        model: externalFirst,
        monaco: fake.monaco,
        onUnmount,
      });
      setProps = propsState.set;
      return <MonacoEditor {...propsState()} />;
    }

    container = mount(<Harness />);

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    setProps((prev) => ({
      ...prev,
      model: externalSecond,
    }));

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(fake.editors[0].setModelCalls).toEqual([externalSecond]);
    expect(
      (
        externalFirst as ReturnType<
          typeof createFakeMonaco
        >['createdModels'][number]
      ).disposeCalls
    ).toBe(0);

    unmount(container);
    container = undefined;

    expect(fake.editors[0].disposed).toBe(true);
    expect(onUnmount).toHaveBeenCalledWith(fake.editors[0], fake.monaco);
    expect(
      (
        externalSecond as ReturnType<
          typeof createFakeMonaco
        >['createdModels'][number]
      ).disposeCalls
    ).toBe(0);

    const internal = createFakeMonaco();
    const internalContainer = mount(
      <MonacoEditor
        aria-label="Monaco editor"
        monaco={internal.monaco}
        value="internal"
      />
    );

    await flushUpdates();
    await flushUpdates();

    unmount(internalContainer);

    expect(internal.createdModels).toHaveLength(1);
    expect(internal.createdModels[0].disposeCalls).toBe(1);
  });

  it('should abandon editor creation when async beforeMount resolves after unmount', async () => {
    const fake = createFakeMonaco();
    const hostRef = { current: null as HTMLDivElement | null };
    const editorRef = { current: null as MonacoEditorInstance | null };
    const monacoRef = { current: null as MonacoNamespace | null };
    const onMount = vi.fn();
    let resolveBeforeMount!: () => void;
    const beforeMount = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveBeforeMount = resolve;
        })
    );

    container = mount(
      <MonacoEditor
        aria-label="Monaco editor"
        beforeMount={beforeMount}
        editorRef={editorRef}
        monaco={fake.monaco}
        monacoRef={monacoRef}
        onMount={onMount}
        path="file:///src/pending.ts"
        ref={hostRef}
        value="pending"
      />
    );

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(beforeMount).toHaveBeenCalledWith(fake.monaco);
    expect(monacoRef.current).toBe(fake.monaco);

    unmount(container);
    container = undefined;

    expect(hostRef.current).toBeNull();
    expect(editorRef.current).toBeNull();
    expect(monacoRef.current).toBeNull();

    resolveBeforeMount();

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(fake.createCalls).toHaveLength(0);
    expect(fake.createdModels).toHaveLength(0);
    expect(onMount).not.toHaveBeenCalled();
    expect(hostRef.current).toBeNull();
    expect(editorRef.current).toBeNull();
    expect(monacoRef.current).toBeNull();

    const remounted = mountExtra(
      <MonacoEditor
        aria-label="Remounted editor"
        monaco={fake.monaco}
        value="ready"
      />
    );
    await flushUpdates();
    await flushUpdates();
    await flushUpdates();
    expect(remounted.querySelector('[data-askr-monaco-editor]')).not.toBeNull();
    expect(fake.createCalls).toHaveLength(1);
  });

  it('should load a new Monaco namespace when a provided namespace is removed', async () => {
    const first = createFakeMonaco();
    const second = createFakeMonaco();
    const loadMonaco = vi.fn(async () => second.monaco);
    const monacoRef = { current: null as MonacoNamespace | null };
    let setProps!: (
      updater: (prev: MonacoEditorProps) => MonacoEditorProps
    ) => void;

    function Harness() {
      const propsState = state<MonacoEditorProps>({
        'aria-label': 'Monaco editor',
        monaco: first.monaco,
        monacoRef,
        path: 'file:///src/namespace.ts',
        value: 'provided',
      });
      setProps = propsState.set;
      return <MonacoEditor {...propsState()} />;
    }

    container = mount(<Harness />);

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(first.createCalls).toHaveLength(1);
    expect(monacoRef.current).toBe(first.monaco);

    setProps((prev) => {
      const { monaco: _monaco, ...rest } = prev;

      return {
        ...rest,
        loadMonaco,
        value: 'loaded',
      };
    });

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(first.editors[0].disposed).toBe(true);
    expect(loadMonaco).toHaveBeenCalledTimes(1);
    expect(monacoRef.current).toBe(second.monaco);
    expect(second.createCalls).toHaveLength(1);
    expect(second.createCalls[0].options.model?.getValue()).toBe('loaded');
  });

  it('should reject duplicate wrapper-owned paths and allow explicit model sharing', async () => {
    const fake = createFakeMonaco();
    const onError = vi.fn();

    container = mount(
      <MonacoEditor
        aria-label="First Monaco editor"
        monaco={fake.monaco}
        path="file:///src/shared.ts"
        value="first"
      />
    );

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    const sharedModel = fake.createdModels[0];

    mountExtra(
      <MonacoEditor
        aria-label="Duplicate Monaco editor"
        monaco={fake.monaco}
        onError={onError}
        path="file:///src/shared.ts"
        value="second"
      />
    );

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(fake.createCalls).toHaveLength(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((onError.mock.calls[0][0] as Error).message).toContain(
      '@askrjs/monaco: path "file:///src/shared.ts" already has a Monaco model'
    );

    const explicitContainer = mountExtra(
      <MonacoEditor
        aria-label="Shared Monaco editor"
        model={sharedModel}
        monaco={fake.monaco}
      />
    );

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(fake.createCalls).toHaveLength(2);
    expect(fake.createCalls[1].options.model).toBe(sharedModel);

    unmountExtra(explicitContainer);

    expect(sharedModel.disposeCalls).toBe(0);
  });
  it('should report a synchronous loader failure and recover with a new loader', async () => {
    const fake = createFakeMonaco();
    const error = new Error('loader failed synchronously');
    const onError = vi.fn();
    const editorRef = { current: null as MonacoEditorInstance | null };
    const monacoRef = { current: null as MonacoNamespace | null };
    let setLoader!: (
      loader: () => MonacoNamespace | PromiseLike<MonacoNamespace>
    ) => void;
    function Harness() {
      const loader = state<NonNullable<MonacoEditorProps['loadMonaco']>>(() => {
        throw error;
      });
      setLoader = (next) => loader.set(() => next);
      return (
        <MonacoEditor
          aria-label="Loader editor"
          loadMonaco={loader()}
          onError={onError}
          editorRef={editorRef}
          monacoRef={monacoRef}
        />
      );
    }
    container = mount(<Harness />);
    await flushUpdates();
    await flushUpdates();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(editorRef.current).toBeNull();
    expect(monacoRef.current).toBeNull();
    setLoader(() => fake.monaco);
    await flushUpdates();
    await flushUpdates();
    await flushUpdates();
    expect(fake.createCalls).toHaveLength(1);
    expect(editorRef.current).toBe(fake.editors[0]);
  });

  it('should report a rejected loader once and leave no partial editor or model', async () => {
    const fake = createFakeMonaco();
    const error = new Error('load rejected');
    const onError = vi.fn();
    const editorRef = { current: null as MonacoEditorInstance | null };
    const monacoRef = { current: null as MonacoNamespace | null };
    container = mount(
      <MonacoEditor
        aria-label="Failed editor"
        loadMonaco={() => Promise.reject(error)}
        onError={onError}
        editorRef={editorRef}
        monacoRef={monacoRef}
      />
    );
    await flushUpdates();
    await flushUpdates();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(editorRef.current).toBeNull();
    expect(monacoRef.current).toBeNull();
    expect(fake.createdModels).toHaveLength(0);
  });

  it.each(['resolve', 'reject'] as const)(
    'should not clear the current loader when an obsolete loader %ss',
    async (outcome) => {
      const obsolete = createFakeMonaco();
      const current = createFakeMonaco();
      let resolveObsolete!: (monaco: MonacoNamespace) => void;
      let rejectObsolete!: (error: Error) => void;
      let resolveCurrent!: (monaco: MonacoNamespace) => void;
      const first = () =>
        new Promise<MonacoNamespace>((resolve, reject) => {
          resolveObsolete = resolve;
          rejectObsolete = reject;
        });
      const pending = new Promise<MonacoNamespace>((resolve) => {
        resolveCurrent = resolve;
      });
      const second = vi.fn(() => pending);
      const onError = vi.fn();
      let setProps!: (
        updater: (prev: MonacoEditorProps) => MonacoEditorProps
      ) => void;
      function Harness() {
        const props = state<MonacoEditorProps>({
          loadMonaco: first,
          onError,
          path: 'file:///first.ts',
        });
        setProps = props.set;
        return <MonacoEditor aria-label="Pending editor" {...props()} />;
      }
      container = mount(<Harness />);
      await flushUpdates();
      setProps((props) => ({ ...props, loadMonaco: second }));
      await flushUpdates();
      expect(second).toHaveBeenCalledTimes(1);
      if (outcome === 'resolve') resolveObsolete(obsolete.monaco);
      else rejectObsolete(new Error('obsolete failure'));
      await flushUpdates();
      setProps((props) => ({
        ...props,
        path: 'file:///latest.ts',
        value: 'latest',
      }));
      await flushUpdates();
      expect(second).toHaveBeenCalledTimes(1);
      resolveCurrent(current.monaco);
      await flushUpdates();
      await flushUpdates();
      await flushUpdates();
      expect(obsolete.createCalls).toHaveLength(0);
      expect(onError).not.toHaveBeenCalled();
      expect(current.createCalls).toHaveLength(1);
      expect(current.createdModels[0].uri.toString()).toBe('file:///latest.ts');
      expect(current.createdModels[0].getValue()).toBe('latest');
    }
  );

  it('should create only the latest external model when loading finishes after replacement', async () => {
    const fake = createFakeMonaco();
    const firstModel = fake.monaco.editor.createModel('first');
    const latestModel = fake.monaco.editor.createModel('latest');
    let resolveLoad!: (monaco: MonacoNamespace) => void;
    const loadMonaco = vi.fn(
      () =>
        new Promise<MonacoNamespace>((resolve) => {
          resolveLoad = resolve;
        })
    );
    let setModel!: (model: typeof firstModel) => void;
    function Harness() {
      const model = state(firstModel);
      setModel = model.set;
      return (
        <MonacoEditor
          aria-label="Model editor"
          loadMonaco={loadMonaco}
          model={model()}
        />
      );
    }
    container = mount(<Harness />);
    await flushUpdates();
    setModel(latestModel);
    await flushUpdates();
    expect(loadMonaco).toHaveBeenCalledTimes(1);
    resolveLoad(fake.monaco);
    await flushUpdates();
    await flushUpdates();
    await flushUpdates();
    expect(fake.createCalls).toHaveLength(1);
    expect(fake.editors[0].getModel()).toBe(latestModel);
    expect(fake.createdModels).toHaveLength(2);
    unmount(container);
    container = undefined;
    expect(fake.editors[0].disposeCalls).toBe(1);
    expect(fake.createdModels.map((model) => model.disposeCalls)).toEqual([
      0, 0,
    ]);
  });

  it.each(['resolve', 'reject'] as const)(
    'should ignore a loader that %ss after unmount',
    async (outcome) => {
      const fake = createFakeMonaco();
      const onError = vi.fn();
      const onMount = vi.fn();
      const editorRef = { current: null as MonacoEditorInstance | null };
      const monacoRef = { current: null as MonacoNamespace | null };
      let resolveLoad!: (monaco: MonacoNamespace) => void;
      let rejectLoad!: (error: Error) => void;
      container = mount(
        <MonacoEditor
          aria-label="Unmounting editor"
          onError={onError}
          onMount={onMount}
          editorRef={editorRef}
          monacoRef={monacoRef}
          loadMonaco={() =>
            new Promise<MonacoNamespace>((resolve, reject) => {
              resolveLoad = resolve;
              rejectLoad = reject;
            })
          }
        />
      );
      await flushUpdates();
      unmount(container);
      container = undefined;
      if (outcome === 'resolve') resolveLoad(fake.monaco);
      else rejectLoad(new Error('late load failure'));
      await flushUpdates();
      await flushUpdates();
      expect(onError).not.toHaveBeenCalled();
      expect(onMount).not.toHaveBeenCalled();
      expect(fake.createCalls).toHaveLength(0);
      expect(fake.createdModels).toHaveLength(0);
      expect(editorRef.current).toBeNull();
      expect(monacoRef.current).toBeNull();
    }
  );

  it('should release an owned model after editor creation fails and allow recovery', async () => {
    const fake = createFakeMonaco();
    const error = new Error('editor creation failed');
    vi.spyOn(fake.monaco.editor, 'create').mockImplementationOnce(() => {
      throw error;
    });
    const onError = vi.fn();
    const editorRef = { current: null as MonacoEditorInstance | null };
    let setValue!: (value: string) => void;
    function Harness() {
      const value = state('first');
      setValue = value.set;
      return (
        <MonacoEditor
          aria-label="Recovery editor"
          monaco={fake.monaco}
          path="file:///recovery.ts"
          value={value()}
          onError={onError}
          editorRef={editorRef}
        />
      );
    }
    container = mount(<Harness />);
    await flushUpdates();
    await flushUpdates();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(editorRef.current).toBeNull();
    expect(fake.createdModels[0].disposeCalls).toBe(1);
    expect(fake.monaco.editor.getModel(fake.createdModels[0].uri)).toBeNull();
    setValue('recovered');
    await flushUpdates();
    await flushUpdates();
    expect(fake.editors).toHaveLength(1);
    expect(fake.editors[0].getValue()).toBe('recovered');
    expect(editorRef.current).toBe(fake.editors[0]);
    unmount(container);
    container = undefined;
    expect(fake.createdModels.map((model) => model.disposeCalls)).toEqual([
      1, 1,
    ]);
    expect(fake.editors[0].disposeCalls).toBe(1);
  });
  it('should release listeners, models and refs exactly once through repeated mounts', async () => {
    const fake = createFakeMonaco();
    const listener = vi.fn();
    const disposals: ReturnType<typeof vi.fn>[] = [];
    const onUnmount = vi.fn();
    for (let index = 0; index < 8; index += 1) {
      const editorRef = { current: null as MonacoEditorInstance | null };
      const monacoRef = { current: null as MonacoNamespace | null };
      let disposeRegistration = () => {};
      let setValue!: (value: string) => void;
      function Harness() {
        const value = state('seed');
        setValue = value.set;
        return (
          <MonacoEditor
            aria-label="Repeated editor"
            monaco={fake.monaco}
            editorRef={editorRef}
            monacoRef={monacoRef}
            value={value()}
            onMount={(editor) => {
              const registration = editor.onDidChangeModelContent(listener);
              const dispose = vi.fn(() => registration.dispose());
              disposals.push(dispose);
              disposeRegistration = dispose;
            }}
            onUnmount={() => {
              onUnmount();
              disposeRegistration();
            }}
          />
        );
      }
      const mounted = mountExtra(<Harness />);
      await flushUpdates();
      await flushUpdates();
      const editor = fake.editors[index];
      editor.emitModelContentChange('changed');
      expect(listener).toHaveBeenCalledTimes(index + 1);
      unmountExtra(mounted);
      setValue('after unmount');
      await flushUpdates();
      expect(editor.disposeCalls).toBe(1);
      expect(fake.createdModels[index].disposeCalls).toBe(1);
      expect(disposals[index]).toHaveBeenCalledTimes(1);
      expect(editorRef.current).toBeNull();
      expect(monacoRef.current).toBeNull();
      expect(editor.updateOptionsCalls).toHaveLength(0);
      expect(editor.setModelCalls).toHaveLength(0);
    }
    expect(onUnmount).toHaveBeenCalledTimes(8);
    expect(fake.editors).toHaveLength(8);
  });

  it('should retain a caller-owned model when editor creation fails', async () => {
    const fake = createFakeMonaco();
    const model = fake.monaco.editor.createModel('external');
    const error = new Error('external editor creation failed');
    vi.spyOn(fake.monaco.editor, 'create').mockImplementationOnce(() => {
      throw error;
    });
    const onError = vi.fn();
    container = mount(
      <MonacoEditor
        aria-label="External failure"
        monaco={fake.monaco}
        model={model}
        onError={onError}
      />
    );
    await flushUpdates();
    await flushUpdates();
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    unmount(container);
    container = undefined;
    expect(fake.createdModels[0].disposeCalls).toBe(0);
    expect(model.getValue()).toBe('external');
  });
});
