import type { Page } from '@playwright/test';

const harnessUrl = '/tests/browser/harness.html';

/**
 * Navigate to the static harness page and wait until the harness module has
 * finished evaluating. Monaco is imported eagerly by the harness, so the wait
 * also covers its (large) module graph.
 */
export async function openHarness(page: Page) {
  await page.goto(harnessUrl);
  await page.waitForFunction(() => Boolean(window.askrMonaco), undefined, {
    timeout: 60_000,
  });
}
