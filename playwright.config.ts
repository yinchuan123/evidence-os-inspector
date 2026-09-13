import { defineConfig, devices } from '@playwright/test'

// E2E runs against the production build served under the GitHub Pages
// sub-path, so path handling and refresh behave exactly as deployed.
const BASE = '/evidence-os-inspector/'

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:4173${BASE}`,
    trace: 'retain-on-failure',
    video: process.env.EOSI_VIDEO ? 'on' : 'off',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npm run build:pages && npm run preview:pages',
    url: `http://localhost:4173${BASE}`,
    reuseExistingServer: false, // always rebuild; a stale server on 4173 must fail loudly
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } }, testIgnore: /narrow\.spec\.ts/ },
    { name: 'narrow', use: { ...devices['Pixel 7'] }, testMatch: /narrow\.spec\.ts/ },
  ],
})
