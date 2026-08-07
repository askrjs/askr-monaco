import { describe, it } from 'vite-plus/test';
import { MonacoEditor } from '../../../../src';
import { createFakeMonaco } from '../../../monaco-test-utils';
import { expectNoAxeViolations } from '../../../browser/accessibility';

describe('MonacoEditor - Accessibility', () => {
  it('should have no automated axe violations for the editor host', async () => {
    const fake = createFakeMonaco();

    await expectNoAxeViolations(
      <MonacoEditor aria-label="Monaco editor host" monaco={fake.monaco} />
    );
  });
});
