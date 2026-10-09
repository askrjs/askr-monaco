import { expect, test } from '@playwright/test';
import { openHarness } from '../../open-harness';

test('native edit ranges, shared driver ordering and stale controls retain deterministic ownership', async ({
  page,
}) => {
  await openHarness(page);
  const result = await page.evaluate(() => window.askrMonaco.boundaryEdits());
  expect(result.concurrentValue).toBe('second');
  expect(result.undoSecond).toBe('first');
  expect(result.undoFirst).toBe('seed');
  expect(result.emptyValue).toBe('');
  expect(result.applied).toBe(true);
  expect(result.clampedValue).toBe('clamped');
  expect(result.normalizedRange).toBe('[1,1 -> 1,1]');
  expect(result.staleDriverError).toContain(
    'requires an editor with an attached model'
  );
  expect(result.modelDisposed).toBe(true);
});
