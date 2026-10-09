import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
assert.deepEqual(Object.keys(manifest.exports).sort(), ['.', './package.json']);
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run the packed consumer through npm run test:exports');
const runNpm = (args, options) =>
  execFileSync(process.execPath, [npmCli, ...args], options);
const root = mkdtempSync(join(tmpdir(), 'askr-monaco-packed-'));
try {
  runNpm(['pack', '--ignore-scripts', '--pack-destination', root], {
    stdio: 'pipe',
  });
  const archives = readdirSync(root).filter((file) => file.endsWith('.tgz'));
  assert.equal(archives.length, 1);
  const consumer = join(root, 'consumer');
  mkdirSync(consumer);
  const floor = /^>=([^ ]+)/.exec(
    manifest.peerDependencies['@askrjs/askr']
  )?.[1];
  assert.ok(floor, 'The packed consumer needs an explicit Askr peer floor');
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({
      name: 'monaco-packed-consumer',
      private: true,
      type: 'module',
      dependencies: {
        '@askrjs/monaco': `file:${join(root, archives[0])}`,
        '@askrjs/askr': floor,
        'monaco-editor': '0.56.0',
      },
    })
  );
  runNpm(['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: consumer,
    stdio: 'pipe',
  });
  writeFileSync(
    join(consumer, 'runtime.mjs'),
    `
import assert from 'node:assert/strict';
import * as wrapper from '@askrjs/monaco';
import { renderToStringSync } from '@askrjs/askr/ssr';
import manifest from '@askrjs/monaco/package.json' with { type: 'json' };
assert.equal(manifest.name, '@askrjs/monaco');
assert.deepEqual(Object.keys(wrapper), ['MonacoEditor']);
const html = renderToStringSync(() => wrapper.MonacoEditor({ 'aria-label': 'Editor', loadMonaco: () => { throw new Error('SSR must not load Monaco'); } }));
assert.ok(html.includes('data-askr-monaco-editor') && html.includes('aria-label="Editor"'));
for (const path of ['monaco-editor', 'testing', 'dist/components/monaco-editor/monaco-editor.js']) {
  await assert.rejects(import('@askrjs/monaco/' + path), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
}
`
  );
  execFileSync(process.execPath, ['runtime.mjs'], {
    cwd: consumer,
    stdio: 'inherit',
  });
  const removed = [
    'MonacoEditorInstance',
    'MonacoTextModel',
    'MonacoUri',
    'MonacoNamespace',
    'MonacoLoader',
    'MonacoBeforeMount',
    'MonacoMountHandler',
    'MonacoErrorHandler',
    'MonacoEditorTestDriver',
  ];
  writeFileSync(
    join(consumer, 'types.ts'),
    `
import { MonacoEditor, type MonacoEditorProps, type MonacoEditorOptions } from '@askrjs/monaco';
import type * as Monaco from 'monaco-editor';
const options: MonacoEditorOptions = { readOnly: true };
const props: MonacoEditorProps = { options, editorRef: { current: null as Monaco.editor.IStandaloneCodeEditor | null }, loadMonaco: async () => await import('monaco-editor') };
MonacoEditor(props);
${removed.map((name) => `// @ts-expect-error ${name} is private in 0.5\nimport type { ${name} } from '@askrjs/monaco';`).join('\n')}
// @ts-expect-error test controls are private
import { createMonacoEditorTestDriver } from '@askrjs/monaco';
// @ts-expect-error duplicate component path removed
import { MonacoEditor as DeepEditor } from '@askrjs/monaco/monaco-editor';
// @ts-expect-error test-only path removed
import { createMonacoEditorTestDriver as Driver } from '@askrjs/monaco/testing';
// @ts-expect-error model belongs on the wrapper props
const invalid: MonacoEditorOptions = { model: null };
`
  );
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        types: [],
      },
      files: ['types.ts'],
    })
  );
  execFileSync(
    process.execPath,
    [
      resolve('node_modules/typescript/bin/tsc'),
      '-p',
      join(consumer, 'tsconfig.json'),
    ],
    { stdio: 'inherit' }
  );
  console.log(
    'Packed Monaco runtime, SSR host, types, and removed paths passed.'
  );
} finally {
  rmSync(root, { recursive: true, force: true });
}
