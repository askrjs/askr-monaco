import { describe, expect, it } from 'vite-plus/test';
import * as askrMonaco from '../../src';

describe('Public API', () => {
  it('exports MonacoEditor from the root entrypoint', () => {
    expect('MonacoEditor' in askrMonaco).toBe(true);
    expect(askrMonaco.MonacoEditor).toEqual(expect.any(Function));
  });
});

