import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Increase timeout for E2E tests (especially those using Puppeteer)
    // Puppeteer can be slow in CI environments
    testTimeout: 60000, // 60 seconds
    // Separate timeout for hooks
    hookTimeout: 10000, // 10 seconds
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', 'tests/']
    }
  }
});

