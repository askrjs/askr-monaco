import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

function readComponentDirectories() {
  return readdirSync(join(process.cwd(), 'src', 'components'), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

describe('Source layout', () => {
  it('keeps the component tree flat and one folder per public component', () => {
    expect(readComponentDirectories()).toEqual(['monaco-editor']);

    expect(
      existsSync(join(process.cwd(), 'src', 'components', 'monaco-editor', 'index.ts'))
    ).toBe(true);
  });
});

