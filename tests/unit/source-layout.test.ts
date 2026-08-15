import { existsSync, readFileSync, readdirSync } from 'node:fs';
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
  it('should keep the component tree flat and one folder per public component', () => {
    expect(readComponentDirectories()).toEqual(['monaco-editor']);

    expect(
      existsSync(
        join(process.cwd(), 'src', 'components', 'monaco-editor', 'index.ts')
      )
    ).toBe(true);
  });

  it('should pin controlled lifecycle coverage to the affected Askr release', () => {
    const workflow = readFileSync(
      join(process.cwd(), '.github', 'workflows', 'ci.yml'),
      'utf8'
    );

    expect(workflow).toContain("askr-version: ['0.0.88', '0.0.91', latest]");
    expect(workflow).toContain(
      'tests/browser/components/monaco-editor/integration.test.tsx'
    );
  });
});
