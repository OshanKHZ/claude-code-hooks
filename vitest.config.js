const { defineConfig } = require('vitest/config');
const path = require('path');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.js',
        '**/*.spec.js',
        'vitest.config.js',
        'typescript-react/tsconfig-cache.json',
        'typescript-react/typecheck-results-cache.json',
        'typescript-react/.tsbuildinfo'
      ],
      include: ['typescript-react/**/*.js'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    isolate: true,
    mockReset: true,
    restoreMocks: true,
    clearMocks: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'typescript-react')
    }
  }
});
