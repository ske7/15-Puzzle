import { defineConfig, devices } from '@playwright/test';

// On-demand E2E suite (npm run test:e2e) - never wired into CI or any hook. Runs against a
// real built-and-served bundle (vite build --mode test && vite preview), not the dev server,
// so it exercises the same output that actually ships. The "test" mode is what turns on
// main.ts's window.__cage15Test__ hook (see env.d.ts) - a dedicated Vite mode keeps it fully
// tree-shaken out of real dev/production builds.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  // `vite preview` isn't built for heavy concurrency - occasional connection-refused
  // flakes have shown up under Firefox specifically when several workers hit it at once.
  // One local retry absorbs that without masking a real, consistently-failing test.
  retries: process.env.CI ? 2 : 1,
  reporter: 'html',
  // One baseline per snapshot for every browser and OS: startup.spec.ts records app state,
  // not pixels, so all three browsers must reach the same result.
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    // build-only (not the full `build`, which also runs type-check in parallel via
    // run-p and doesn't forward --mode to it) - type-check has its own separate script.
    command: 'npm run build-only -- --mode test && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  }
});
