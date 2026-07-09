import { describe, it } from 'vite-plus/test';
import { MonacoEditor } from '../../../../src';
import { createFakeMonaco } from '../../../monaco-test-utils';
import { expectNoAxeViolations } from '../../../browser/accessibility';

describe('MonacoEditor - Accessibility', () => {
  it('has no automated axe violations for the placeholder shell', async () => {
    const fake = createFakeMonaco();

    await expectNoAxeViolations(
      <MonacoEditor
        aria-label="Monaco editor placeholder"
        monaco={fake.monaco}
      />
    );
  });
});
