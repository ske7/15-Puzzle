import { fileURLToPath } from 'node:url';
import { configDefaults, defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  // Deliberately not reusing vite.config.ts wholesale: vite-plugin-preload and
  // unplugin-inject-preload are build-only concerns and aren't safe to run
  // through Vitest's transform pipeline. Only the pieces tests actually need
  // (Vue SFC support, the @ alias) are duplicated here.
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    // Reuses one jsdom per worker instead of building a fresh one for each of the 35
    // files, while still giving every file its own module registry. Files also run in
    // parallel (the default). Together: ~159s -> ~8s. The suite passes on the default
    // 'forks' pool too, so this is a speed choice, not a dependency.
    pool: 'vmThreads',
    environment: 'jsdom',
    testTimeout: 10000,
    restoreMocks: true,
    // restoreMocks only undoes mockImplementation/mockResolvedValue overrides; it does
    // NOT reset a mock's recorded call history. Without clearMocks, any long-lived
    // mock (e.g. tests/setup.ts's navigator.clipboard.readText, wrapped fresh via
    // vi.spyOn() in test after test) keeps accumulating calls across the whole file,
    // silently breaking .not.toHaveBeenCalled()-style assertions in later tests.
    clearMocks: true,
    // Not enabled: isolate: false. It buys nothing here - measured at 11.5-17.2s against
    // 8.2-17.1s without it, i.e. inside the run-to-run noise, because vmThreads already
    // reuses the environment per worker. It also costs the per-file module registry: on
    // the 'forks' pool, this setupFiles' global mocks lose their implementations to
    // restoreMocks when setup runs once per worker rather than once per file, which fails
    // tests in an order-dependent way. That is only reachable with shared modules, so it is
    // left alone deliberately rather than fixed for a flag we do not want.
    setupFiles: ['./tests/setup.ts'],
    // Vitest's default include pattern matches any **/*.spec.ts, which would otherwise also
    // pick up the on-demand Playwright suite in e2e/ - those use test.describe() from
    // @playwright/test, not Vitest's runner, and aren't meant to run via `vitest`/`npm test`.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/main.ts',
        'src/types.ts',
        'src/const.ts',
        'src/**/*.d.ts',
        // Obfuscated anti-cheat signature generator that hijacks console.* at import time
        // (javascript-obfuscator "self-defending" output) - unsafe to exercise in-process.
        'src/utils_x.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});
