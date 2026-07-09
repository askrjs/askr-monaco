import { state } from '@askrjs/askr';
import type { MonacoEditorProps, MonacoEditorInstance, MonacoNamespace } from '../../../../src';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { MonacoEditor } from '../../../../src';
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

  it('creates a Monaco editor with raw options and lifecycle hooks', async () => {
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

  it('updates the live editor without recreating it for mutable props', async () => {
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
    let setProps!: (updater: (prev: MonacoEditorProps) => MonacoEditorProps) => void;

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

  it('keeps external models owned by the caller and disposes internal ones', async () => {
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
    let setProps!: (updater: (prev: MonacoEditorProps) => MonacoEditorProps) => void;

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
    expect((externalFirst as ReturnType<typeof createFakeMonaco>['createdModels'][number]).disposeCalls).toBe(0);

    unmount(container);
    container = undefined;

    expect(fake.editors[0].disposed).toBe(true);
    expect(onUnmount).toHaveBeenCalledWith(fake.editors[0], fake.monaco);
    expect((externalSecond as ReturnType<typeof createFakeMonaco>['createdModels'][number]).disposeCalls).toBe(0);

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

  it('abandons editor creation when async beforeMount resolves after unmount', async () => {
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
  });

  it('loads a new Monaco namespace when a provided namespace is removed', async () => {
    const first = createFakeMonaco();
    const second = createFakeMonaco();
    const loadMonaco = vi.fn(async () => second.monaco);
    const monacoRef = { current: null as MonacoNamespace | null };
    let setProps!: (updater: (prev: MonacoEditorProps) => MonacoEditorProps) => void;

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

  it('rejects duplicate wrapper-owned paths and allows explicit model sharing', async () => {
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
});
