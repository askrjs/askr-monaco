import { expect, test } from '@playwright/test';
import { openHarness } from '../../open-harness';

test.describe('MonacoEditor - Determinism', () => {
  test('should render stable host markup', async ({ page }) => {
    await openHarness(page);

    const { first, second } = await page.evaluate(() =>
      window.askrMonaco.determinismRenders()
    );

    expect(first).toBe(second);
  });
});
