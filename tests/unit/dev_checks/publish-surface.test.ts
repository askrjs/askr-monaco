import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vite-plus/test';

type ExportTarget = {
  types: string;
  import: string;
};

type PackFile = {
  path: string;
};

type PackResult = {
  files: PackFile[];
};

type PackageJson = {
  exports: Record<string, ExportTarget | string>;
};

const expectedPackFiles = [
  'LICENSE',
  'README.md',
  'dist/components/index.d.ts',
  'dist/components/index.js',
  'dist/components/monaco-editor/index.d.ts',
  'dist/components/monaco-editor/index.js',
  'dist/components/monaco-editor/monaco-editor.d.ts',
  'dist/components/monaco-editor/monaco-editor.d.ts.map',
  'dist/components/monaco-editor/monaco-editor.js',
  'dist/components/monaco-editor/monaco-editor.js.map',
  'dist/components/monaco-editor/monaco-editor.types.d.ts',
  'dist/components/monaco-editor/monaco-editor.types.d.ts.map',
  'dist/index.d.ts',
  'dist/index.js',
  'package.json',
].sort();

function readPackageJson(): PackageJson {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'package.json'), 'utf8')
  ) as PackageJson;
}

function runCommand(command: string, args: string[]) {
  return execFileSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

describe('Publish surface checks', () => {
  let packageJson: PackageJson;
  let packFilePaths: string[];

  beforeAll(() => {
    runCommand('npm', ['run', 'build']);
    packageJson = readPackageJson();

    const output = runCommand('npm', ['pack', '--dry-run', '--json']);
    const [result] = JSON.parse(output) as PackResult[];

    packFilePaths = result.files.map((file) => file.path).sort();
  });

  it('packs the curated ESM release surface only', () => {
    expect(packFilePaths).toEqual(expectedPackFiles);
  });

  it('includes every advertised public export target in the tarball', () => {
    for (const [subpath, target] of Object.entries(packageJson.exports)) {
      if (subpath === './package.json' || typeof target === 'string') {
        continue;
      }

      expect(packFilePaths).toContain(target.import.replace(/^\.\//, ''));
      expect(packFilePaths).toContain(target.types.replace(/^\.\//, ''));
    }

    expect(packFilePaths.some((path) => path.endsWith('.cjs'))).toBe(false);
    expect(packFilePaths.some((path) => path.includes('.d.cts'))).toBe(false);
    expect(packFilePaths.some((path) => path.endsWith('.tsbuildinfo'))).toBe(
      false
    );
  });

  it('emits importable ESM modules for every public entrypoint', async () => {
    const publicExports = Object.entries(packageJson.exports).filter(
      (entry): entry is [string, ExportTarget] =>
        entry[0] !== './package.json' && typeof entry[1] !== 'string'
    );

    for (const [subpath, target] of publicExports) {
      const modulePath = join(process.cwd(), target.import);
      const loadedModule = await import(pathToFileURL(modulePath).href);
      const exportNames = Object.keys(loadedModule)
        .filter((name) => name !== 'default')
        .sort();

      expect(exportNames, `${subpath} export names`).not.toHaveLength(0);
    }
  });
});
