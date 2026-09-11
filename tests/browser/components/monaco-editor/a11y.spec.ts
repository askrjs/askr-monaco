import { expect, test } from '@playwright/test';
import { openHarness } from '../../open-harness';

test.describe('MonacoEditor - Accessibility', () => {
  test('should have no automated axe violations for the editor host', async ({
    page,
  }) => {
    await openHarness(page);

    const violations = await page.evaluate(() =>
      window.askrMonaco.axeViolations()
    );

    expect(violations).toEqual([]);
  });
});
