import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

describe('Docs contract', () => {
  it('keeps the scaffold docs in place', () => {
    for (const filename of [
      'README.md',
      'docs/README.md',
      'docs/askr-monaco.md',
    ]) {
      expect(existsSync(join(process.cwd(), filename))).toBe(true);
    }

    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf8');
    const packageOverview = readFileSync(
      join(process.cwd(), 'docs/askr-monaco.md'),
      'utf8'
    );

    expect(readme).toContain('@askrjs/monaco');
    expect(readme).toContain('ESM-only');
    expect(readme).toContain('MonacoEditor');
    expect(readme).toContain('npm install @askrjs/monaco monaco-editor');
    expect(readme).toContain("import * as monaco from 'monaco-editor';");
    expect(readme).toContain('options={{ automaticLayout: true');
    expect(packageOverview).toContain('thin `MonacoEditor` host');
    expect(packageOverview).toContain('model ownership');
  });
});
