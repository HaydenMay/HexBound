import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:4173'
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/HexBound/',
    reuseExistingServer: true,
    timeout: 30_000
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } }, testIgnore: /mobile\.spec\.ts/ }
  ]
})
