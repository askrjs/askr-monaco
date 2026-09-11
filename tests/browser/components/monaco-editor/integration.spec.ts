import { expect, test } from '@playwright/test';
import { openHarness } from '../../open-harness';

test.describe('MonacoEditor - real Monaco integration', () => {
  test.beforeEach(async ({ page }) => {
    await openHarness(page);
  });

  test.afterEach(async ({ page }) => {
    await page.evaluate(() => window.askrMonaco.teardown());
  });

  test('should preserve the editor, model, focus, and view state through controlled updates', async ({
    page,
  }) => {
    const result = await page.evaluate(() =>
      window.askrMonaco.controlledUpdatesSetup()
    );

    expect(result.sameEditor).toBe(true);
    expect(result.sameModel).toBe(true);
    expect(result.hasTextFocus).toBe(true);
    expect(result.selection).toBe(result.expectedSelection);
    expect(result.scrollTop).toBeGreaterThan(0);
    expect(result.value).toContain('line 80 updated');
  });

  test('should preserve selection, completion, and history through controlled parent rerenders', async ({
    page,
  }) => {
    await page.evaluate(() => window.askrMonaco.historySetup());

    await page.keyboard.press('Backspace');

    const afterBackspace = await page.evaluate(() =>
      window.askrMonaco.afterBackspace()
    );
    expect(afterBackspace.sameEditor).toBe(true);
    expect(afterBackspace.sameModel).toBe(true);
    expect(afterBackspace.hasTextFocus).toBe(true);
    expect(afterBackspace.value).toBe('');

    const afterReplace = await page.evaluate(() =>
      window.askrMonaco.replaceAll('SEL')
    );
    expect(afterReplace.sameEditor).toBe(true);
    expect(afterReplace.sameModel).toBe(true);
    expect(afterReplace.hasTextFocus).toBe(true);
    expect(afterReplace.unmountCalls).toBe(0);

    await page.evaluate(() =>
      window.askrMonaco.trigger('editor.action.triggerSuggest')
    );
    await expect
      .poll(() => page.evaluate(() => window.askrMonaco.suggestWidgetState()))
      .toEqual({ visible: true, focusedRow: true });

    await page.evaluate(() =>
      window.askrMonaco.trigger('acceptSelectedSuggestion')
    );
    const afterAccept = await page.evaluate(() =>
      window.askrMonaco.liveState()
    );
    expect(afterAccept.sameEditor).toBe(true);
    expect(afterAccept.sameModel).toBe(true);
    expect(afterAccept.unmountCalls).toBe(0);
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

    const finalState = await page.evaluate(() => window.askrMonaco.liveState());
    expect(finalState.sameEditor).toBe(true);
    expect(finalState.unmountCalls).toBe(0);
  });

  test('should synchronize an external value without replacing the editor or view state', async ({
    page,
  }) => {
    const result = await page.evaluate(() =>
      window.askrMonaco.externalValueSetup()
    );

    expect(result.sameEditor).toBe(true);
    expect(result.sameModel).toBe(true);
    expect(result.hasTextFocus).toBe(true);
    expect(result.selection).toBe(result.expectedSelection);
    expect(result.scrollTop).toBeGreaterThan(0);
    expect(result.value).toContain('updated 80');
  });
});
