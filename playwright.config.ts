import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  retries: 1,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  reporter: 'line',
  projects: [
    { name: 'desktop' },
    // телефони: лише тести дока (CLASS_TOOLS_SPEC §4); WebKit для iPhone ставиться окремо: npx playwright install webkit
    { name: 'Pixel 7', testMatch: /dock-.*\.spec\.ts|words\.spec\.ts|board\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'iPhone 13', testMatch: /dock-.*\.spec\.ts|words\.spec\.ts|board\.spec\.ts/, use: { ...devices['iPhone 13'] } },
  ],
});
