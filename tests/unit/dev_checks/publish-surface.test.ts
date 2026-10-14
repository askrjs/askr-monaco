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
  id: string;
  name: string;
  version: string;
  filename: string;
  integrity: string;
  files: PackFile[];
};

type PackageJson = {
  name: string;
  version: string;
  exports: Record<string, ExportTarget | string>;
};

const expectedPackFiles = [
  'LICENSE',
  'README.md',
  'dist/components/index.d.ts',
  'dist/components/index.js',
  'dist/components/monaco-editor/imperative-host.js',
  'dist/components/monaco-editor/imperative-host.js.map',
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

function readPackResult(
  output: string,
  expected: Pick<PackageJson, 'name' | 'version'>
): PackResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('Expected npm pack --json to return one package record');
  }

  let recordValue: unknown;
  if (Array.isArray(parsed)) {
    if (parsed.length !== 1) {
      throw new Error('Expected npm pack --json to return one package record');
    }
    recordValue = parsed[0];
  } else if (parsed !== null && typeof parsed === 'object') {
    const keys = Object.keys(parsed);
    if (keys.length !== 1 || keys[0] !== expected.name) {
      throw new Error('Expected npm pack --json to return one package record');
    }
    recordValue = (parsed as Record<string, unknown>)[expected.name];
  } else {
    throw new Error('Expected npm pack --json to return one package record');
  }
  const record = recordValue as Partial<PackResult> | null;
  const expectedFilename = `${expected.name.replace(/^@/, '').replace('/', '-')}-${expected.version}.tgz`;
  if (
    record === null ||
    typeof record !== 'object' ||
    Array.isArray(record) ||
    record.id !== `${expected.name}@${expected.version}` ||
    record.name !== expected.name ||
    record.version !== expected.version ||
    record.filename !== expectedFilename ||
    typeof record.integrity !== 'string' ||
    !/^sha512-[A-Za-z0-9+/]{86}==$/.test(record.integrity) ||
    !Array.isArray(record.files) ||
    !record.files.every(
      (file) =>
        file !== null &&
        typeof file === 'object' &&
        typeof file.path === 'string'
    )
  ) {
    throw new Error(
      'Expected npm pack --json to return one valid record for the expected package'
    );
  }
  return record as PackResult;
}

function runNpmCommand(args: string[]) {
  const npmCliPath = process.env.npm_execpath;
  if (!npmCliPath) {
    throw new Error('npm_execpath is required to run publish surface checks');
  }

  return execFileSync(process.execPath, [npmCliPath, ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

describe('npm pack JSON', () => {
  const expected = { name: '@askrjs/monaco', version: '0.5.0' };
  const record = {
    id: '@askrjs/monaco@0.5.0',
    name: '@askrjs/monaco',
    version: '0.5.0',
    filename: 'askrjs-monaco-0.5.0.tgz',
    integrity: `sha512-${Buffer.alloc(64).toString('base64')}`,
    files: [{ path: 'package.json' }],
  };
  it('accepts a single npm 11 array record', () => {
    expect(readPackResult(JSON.stringify([record]), expected)).toEqual(record);
  });
  it('accepts a single expected npm 12 keyed record', () => {
    expect(
      readPackResult(JSON.stringify({ [expected.name]: record }), expected)
    ).toEqual(record);
  });
  it.each([
    ['invalid JSON', '{'],
    ['empty array', JSON.stringify([])],
    ['multiple array records', JSON.stringify([record, record])],
    ['null result', 'null'],
    ['empty result', '{}'],
    ['wrong package key', JSON.stringify({ '@askrjs/other': record })],
    [
      'multiple packages',
      JSON.stringify({ [expected.name]: record, other: record }),
    ],
    [
      'wrong package id',
      JSON.stringify({ [expected.name]: { ...record, id: 'other@0.5.0' } }),
    ],
    [
      'wrong package name',
      JSON.stringify({ [expected.name]: { ...record, name: 'other' } }),
    ],
    [
      'wrong version',
      JSON.stringify({ [expected.name]: { ...record, version: '0.4.0' } }),
    ],
    [
      'unsafe filename',
      JSON.stringify({
        [expected.name]: { ...record, filename: '../package.tgz' },
      }),
    ],
    [
      'invalid SRI',
      JSON.stringify({
        [expected.name]: { ...record, integrity: 'sha512-invalid' },
      }),
    ],
    [
      'missing files list',
      JSON.stringify({ [expected.name]: { ...record, files: null } }),
    ],
    [
      'invalid file path',
      JSON.stringify({ [expected.name]: { ...record, files: [{ path: 1 }] } }),
    ],
  ])('rejects %s', (_label, output) => {
    expect(() => readPackResult(output, expected)).toThrow(/npm pack --json/);
  });
});

describe('Publish surface checks', () => {
  let packageJson: PackageJson;
  let packFilePaths: string[];

  beforeAll(() => {
    runNpmCommand(['run', 'build']);
    packageJson = readPackageJson();

    const output = runNpmCommand([
      'pack',
      '--ignore-scripts',
      '--dry-run',
      '--json',
    ]);
    const result = readPackResult(output, packageJson);

    packFilePaths = result.files.map((file) => file.path).sort();
  });

  it('should pack the curated ESM release surface only', () => {
    expect(packFilePaths).toEqual(expectedPackFiles);
  });

  it('should include every advertised public export target in the tarball', () => {
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

  it('should emit importable ESM modules for every public entrypoint', async () => {
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
