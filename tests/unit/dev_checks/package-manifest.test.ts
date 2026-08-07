import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';

type ExportTarget = {
  types: string;
  import: string;
};

describe('Package manifest checks', () => {
  it('should keep the wrapper package metadata aligned', () => {
    const packageJson = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8')
    ) as {
      name: string;
      type: string;
      files: string[];
      main?: string;
      types: string;
      exports: Record<string, ExportTarget | string>;
      peerDependencies: Record<string, string>;
      devDependencies: Record<string, string>;
      scripts: Record<string, string>;
    };

    expect(packageJson.name).toBe('@askrjs/monaco');
    expect(packageJson.type).toBe('module');
    expect(packageJson.files).toEqual(['dist']);
    expect(packageJson.main).toBe('./dist/index.js');
    expect(packageJson.types).toBe('./dist/index.d.ts');
    expect(packageJson.peerDependencies['@askrjs/askr']).toBeTruthy();
    expect(packageJson.peerDependencies['monaco-editor']).toBeTruthy();
    expect(packageJson.devDependencies['monaco-editor']).toBeTruthy();
    expect(packageJson.scripts.prepack).toBe('npm run build');
    expect(packageJson.scripts.prepublishOnly).toBe('npm run check');

    const publicExports = Object.entries(packageJson.exports).filter(
      (entry): entry is [string, ExportTarget] =>
        entry[0] !== './package.json' && typeof entry[1] !== 'string'
    );

    expect(publicExports).not.toHaveLength(0);

    for (const [, target] of publicExports) {
      expect(target.import.endsWith('.js')).toBe(true);
      expect(target.types.endsWith('.d.ts')).toBe(true);
      expect('require' in target).toBe(false);
      expect(target.import.includes('.cjs')).toBe(false);
      expect(target.types.includes('.d.cts')).toBe(false);
    }
  });
});
