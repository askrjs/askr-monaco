import { expect, test } from '@playwright/test';
import { openHarness } from '../../open-harness';

test.describe('MonacoEditor - Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await openHarness(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => window.askrMonaco.teardown());
  });

  test('should load Monaco lazily and create the editor host once ready', async ({
    page,
  }) => {
    const result = await page.evaluate(() => window.askrMonaco.lazyLoad());

    expect(result.hasHost).toBe(true);
    expect(result.loadMonacoCalls).toBe(1);
    expect(result.createCalls).toBe(1);
  });

  test('should preserve focus when a model change updates controlled parent state', async ({
    page,
  }) => {
    const setup = await page.evaluate(() =>
      window.askrMonaco.focusPreservationSetup()
    );
    expect(setup.createCalls).toBe(1);

    const result = await page.evaluate(() =>
      window.askrMonaco.focusPreservationAfterContentChange()
    );

    expect(result.sameHost).toBe(true);
    expect(result.textareaIsFirstChild).toBe(true);
    expect(result.textareaFocused).toBe(true);
    expect(result.createCalls).toBe(1);
    expect(result.value).toBe('SELECT 12;');
  });
});
