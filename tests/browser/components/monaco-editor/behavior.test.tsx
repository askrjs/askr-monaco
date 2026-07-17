import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
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

  it('loads Monaco lazily and creates the editor host once ready', async () => {
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
});
