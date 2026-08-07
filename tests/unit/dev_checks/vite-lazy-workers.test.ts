import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { build } from 'vite-plus';
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test';

const initialEntryBudget = 225_000;
const monacoEditorBudget = 3_000_000;
const editorWorkerBudget = 1_000_000;
const typeScriptWorkerBudget = 8_000_000;

type OutputAsset = {
  type: 'asset';
  fileName: string;
  source: string | Uint8Array;
};

type OutputChunk = {
  type: 'chunk';
  code: string;
  dynamicImports: string[];
  fileName: string;
  isDynamicEntry: boolean;
  isEntry: boolean;
  modules: Record<string, unknown>;
};

type OutputFile = OutputAsset | OutputChunk;

describe('Vite lazy worker example', () => {
  let outputDirectory: string;
  let outputFiles: OutputFile[];

  beforeAll(async () => {
    outputDirectory = mkdtempSync(join(tmpdir(), 'askr-monaco-vite-'));
    const exampleRoot = join(process.cwd(), 'examples/vite-lazy-workers');
    const result = await build({
      root: exampleRoot,
      configFile: join(exampleRoot, 'vite.config.ts'),
      logLevel: 'silent',
      build: {
        outDir: outputDirectory,
        emptyOutDir: true,
        manifest: true,
      },
    });

    outputFiles = (Array.isArray(result) ? result : [result]).flatMap(
      (output) =>
        'output' in output ? (output.output as unknown as OutputFile[]) : []
    );
  });

  afterAll(() => {
    rmSync(outputDirectory, { recursive: true, force: true });
  });

  it('should keep Monaco and optional workers out of the initial entry', () => {
    const chunks = outputFiles.filter(
      (file): file is OutputChunk => file.type === 'chunk'
    );
    const initialEntry = chunks.find((chunk) => chunk.isEntry);
    const dynamicMonaco = chunks.find((chunk) =>
      Object.keys(chunk.modules).some((moduleId) =>
        moduleId.includes('/monaco-editor/esm/vs/editor/editor.api.js')
      )
    );

    expect(initialEntry).toBeDefined();
    expect(initialEntry!.code.length).toBeLessThanOrEqual(initialEntryBudget);
    expect(dynamicMonaco).toBeDefined();
    expect(initialEntry!.dynamicImports).toContain(dynamicMonaco!.fileName);
    expect(dynamicMonaco!.code.length).toBeLessThanOrEqual(monacoEditorBudget);
  });

  it('should emit only the configured workers within their size budgets', () => {
    const editorWorker = findWorker('editor.worker');
    const typeScriptWorker = findWorker('ts.worker');

    expect(editorWorker).toBeDefined();
    expect(assetSize(editorWorker!)).toBeLessThanOrEqual(editorWorkerBudget);
    expect(typeScriptWorker).toBeDefined();
    expect(assetSize(typeScriptWorker!)).toBeLessThanOrEqual(
      typeScriptWorkerBudget
    );

    for (const workerName of ['json.worker', 'css.worker', 'html.worker']) {
      expect(findWorker(workerName)).toBeUndefined();
    }
  });

  function findWorker(sourceName: string) {
    return outputFiles.find(
      (file): file is OutputAsset =>
        file.type === 'asset' && file.fileName.includes(sourceName)
    );
  }

  function assetSize(asset: OutputAsset) {
    return typeof asset.source === 'string'
      ? asset.source.length
      : asset.source.byteLength;
  }
});
