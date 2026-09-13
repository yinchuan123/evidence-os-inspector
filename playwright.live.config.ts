import { defineConfig, devices } from '@playwright/test'
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'https://yinchuan123.github.io/evidence-os-inspector/', trace: 'retain-on-failure', viewport: { width: 1280, height: 800 } },
  projects: [
    { name: 'desktop-live', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testIgnore: /narrow.*\.spec\.ts/ },
    { name: 'narrow-live', use: { ...devices['Pixel 7'] }, testMatch: /narrow.*\.spec\.ts/ },
  ],
})
