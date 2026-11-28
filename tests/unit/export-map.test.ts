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
  it('should publish the root, explicit loader, and package metadata entrypoints', () => {
    const packageJson = readPackageJson();

    expect(packageJson.exports['.']).toEqual({
      types: './dist/index.d.ts',
      import: './dist/index.js',
    });

    expect(Object.keys(packageJson.exports).sort()).toEqual([
      '.',
      './explicit',
      './package.json',
    ]);

    expect(packageJson.exports['./explicit']).toEqual({
      types: './dist/explicit.d.ts',
      import: './dist/explicit.js',
    });
    expect(packageJson.exports['./package.json']).toBe('./package.json');
  });
});
