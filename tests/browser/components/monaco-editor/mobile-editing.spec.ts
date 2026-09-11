import { expect, test } from '@playwright/test';
import { openHarness } from '../../open-harness';

test.describe('MonacoEditor mobile editing', () => {
  test.beforeEach(async ({ page }) => {
    await openHarness(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => window.askrMonaco.teardown());
  });

  test('should replace selections and completions through the model on desktop and touch devices', async ({
    page,
  }) => {
    const setup = await page.evaluate(() =>
      window.askrMonaco.mobileEditingSetup()
    );
    expect(setup.value).toBe('');

    await page.evaluate(() => window.askrMonaco.replaceAll('SEL'));
    await page.evaluate(() => window.askrMonaco.focusEditor());
    await page.evaluate(() =>
      window.askrMonaco.trigger('editor.action.triggerSuggest')
    );
    await expect
      .poll(() =>
        page.evaluate(() => window.askrMonaco.suggestWidgetState().visible)
      )
      .toBe(true);

    await page.evaluate(() =>
      window.askrMonaco.trigger('acceptSelectedSuggestion')
    );
    await expect
      .poll(() => page.evaluate(() => window.askrMonaco.modelValue()))
      .toBe('SELECT accounts.id');

    await page.evaluate(() => window.askrMonaco.undo());
    await expect
      .poll(() => page.evaluate(() => window.askrMonaco.modelValue()))
      .toBe('SEL');

    await page.evaluate(() => window.askrMonaco.redo());
    await expect
      .poll(() => page.evaluate(() => window.askrMonaco.modelValue()))
      .toBe('SELECT accounts.id');

    const profile = await page.evaluate(() => window.askrMonaco.touchProfile());
    if (profile.userAgent.includes('Pixel 7')) {
      expect(profile.maxTouchPoints).toBeGreaterThan(0);
    }
  });
});
