import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { state } from '@askrjs/askr';
import { MonacoEditor } from '../../../../src';
import { createFakeMonaco } from '../../../monaco-test-utils';
import { mount, unmount } from '../../../test-utils';
import { flushUpdates } from '../../../test-utils';

describe('MonacoEditor - Behavior', () => {
  let container: HTMLElement | undefined;

  afterEach(() => {
    unmount(container);
    container = undefined;
  });

  it('should load Monaco lazily and create the editor host once ready', async () => {
    const fake = createFakeMonaco();
    const loadMonaco = vi.fn(async () => fake.monaco);

    container = mount(
      <MonacoEditor aria-label="Monaco editor" loadMonaco={loadMonaco} />
    );

    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(container.querySelector('[data-askr-monaco-editor]')).toBeTruthy();
    expect(loadMonaco).toHaveBeenCalledTimes(1);
    expect(fake.createCalls).toHaveLength(1);
  });

  it('should preserve focus when a model change updates controlled parent state', async () => {
    const fake = createFakeMonaco();

    function Harness() {
      const value = state('SELECT 1;');

      return (
        <MonacoEditor
          aria-label="SQL editor"
          monaco={fake.monaco}
          onMount={(editor) => {
            editor.onDidChangeModelContent(() => {
              value.set(editor.getValue());
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

    const host = container.querySelector('[data-askr-monaco-editor]')!;
    const textarea = document.createElement('textarea');
    host.appendChild(textarea);
    textarea.focus();

    fake.editors[0].emitModelContentChange('SELECT 12;');
    await flushUpdates();
    await flushUpdates();
    await flushUpdates();

    expect(container.querySelector('[data-askr-monaco-editor]')).toBe(host);
    expect(host.firstChild).toBe(textarea);
    expect(document.activeElement).toBe(textarea);
    expect(fake.createCalls).toHaveLength(1);
    expect(fake.editors[0].getValue()).toBe('SELECT 12;');
  });
});
