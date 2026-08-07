import { describe, it } from 'vite-plus/test';
import { MonacoEditor } from '../../../../src';
import { neverLoadMonaco } from '../../../monaco-test-utils';
import { expectDeterministicRender } from '../../../browser/determinism';

describe('MonacoEditor - Determinism', () => {
  it('should render stable host markup', () => {
    expectDeterministicRender(() => (
      <MonacoEditor
        aria-label="Monaco editor host"
        loadMonaco={neverLoadMonaco}
      />
    ));
  });
});
