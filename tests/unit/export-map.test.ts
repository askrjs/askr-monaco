import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

type ExportTarget = {
  types: string;
  import: string;
};

function readPackageJson(): { exports: Record<string, ExportTarget | string> } {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf8')
  ) as { exports: Record<string, ExportTarget | string> };
}

describe('Package exports', () => {
  it('publishes the root and monaco-editor entrypoints only', () => {
    const packageJson = readPackageJson();

    expect(packageJson.exports['.']).toEqual({
      types: './dist/index.d.ts',
      import: './dist/index.js',
    });

    expect(packageJson.exports['./monaco-editor']).toEqual({
      types: './dist/components/monaco-editor/index.d.ts',
      import: './dist/components/monaco-editor/index.js',
    });

    expect(packageJson.exports['./package.json']).toBe('./package.json');
  });
});
