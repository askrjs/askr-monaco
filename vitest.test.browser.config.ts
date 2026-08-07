import { playwright } from 'vite-plus/test/browser-playwright';
import { defineConfig } from 'vite-plus';
import { devices } from 'playwright';
import { sharedVitestConfig } from './vitest.test.shared';

export default defineConfig({
  ...sharedVitestConfig,
  test: {
    ...sharedVitestConfig.test,
    browser: {
      enabled: true,
      headless: true,
      provider: playwright(),
      instances: [
        { browser: 'chromium', name: 'chromium-desktop' },
        {
          browser: 'chromium',
          name: 'chromium-pixel-7',
          provider: playwright({
            contextOptions: { ...devices['Pixel 7'] },
          }),
        },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
      api: {
        host: '127.0.0.1',
        port: 0,
      },
    },
    include: ['tests/browser/components/**/*.test.tsx'],
  },
});
