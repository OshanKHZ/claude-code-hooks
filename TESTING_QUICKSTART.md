# Testing Quick Start Guide

## Installation

```bash
cd "D:\Olive Sync\Assets\hooks"
npm install
```

This installs:
- `vitest@^2.1.8` - Testing framework
- `@vitest/coverage-v8@^2.1.8` - Coverage reporting
- `@vitest/ui@^2.1.8` - Visual test UI

## Running Tests

### Run All Tests (Single Run)
```bash
npm test
```

**Output Example**:
```
✓ tests/unit/shared-utils.test.js (29 tests) 450ms
✓ tests/unit/check-dependencies.test.js (28 tests) 380ms
✓ tests/unit/validate-imports.test.js (19 tests) 280ms
...
Test Files  7 passed (7)
     Tests  187 passed (187)
  Duration  2.64s
```

### Watch Mode (Auto-Rerun on Changes)
```bash
npm run test:watch
```

**Use Case**: Active development - tests rerun when files change

### Coverage Report
```bash
npm run test:coverage
```

**Generates**:
- Terminal summary
- HTML report in `coverage/index.html`
- LCOV for CI tools

**Open HTML Report**:
```bash
# Windows
start coverage/index.html

# Mac/Linux
open coverage/index.html
```

### Visual Test UI
```bash
npm run test:ui
```

**Features**:
- Interactive test explorer
- Visual test debugging
- Real-time results
- Opens in browser automatically

## Test Structure

```
tests/
├── unit/                          # Unit tests for hooks
│   ├── shared-utils.test.js       # 29 tests - Utilities
│   ├── check-dependencies.test.js # 28 tests - Dependency validation
│   ├── validate-imports.test.js   # 19 tests - Import validation
│   ├── typecheck-after-edit.test.js # 19 tests - TypeScript checking
│   ├── lint-after-edit.test.js    # 20 tests - ESLint
│   └── format-on-edit.test.js     # 51 tests - Prettier
├── integration/
│   └── orchestrator.test.js       # 21 tests - Hook orchestration
├── helpers/
│   └── test-utils.js              # Test utilities
└── fixtures/
    ├── sample-files.js            # Sample code
    └── mock-config.js             # Mock configurations
```

## Running Individual Test Files

### Run Specific Test File
```bash
npx vitest run tests/unit/shared-utils.test.js
```

### Run Tests Matching Pattern
```bash
npx vitest run tests/unit/check-dependencies
```

### Run Integration Tests Only
```bash
npx vitest run tests/integration
```

## Understanding Test Output

### Success
```
✓ tests/unit/shared-utils.test.js (29)
  ✓ loadConfig (4)
    ✓ should load config from file when it exists
    ✓ should return default config when file does not exist
    ...
```

### Failure
```
✗ tests/unit/validate-imports.test.js (19)
  ✗ should block imports to non-existent files
    AssertionError: expected 'ok' to be 'blocked'

    Expected: "blocked"
    Received: "ok"
```

## Common Testing Scenarios

### Testing a Single Hook
```bash
# Test check-dependencies hook
npx vitest run check-dependencies.test.js

# Test with coverage
npx vitest run check-dependencies.test.js --coverage
```

### Debugging Failed Tests
```bash
# Run in watch mode to see failures update
npm run test:watch

# Use UI for visual debugging
npm run test:ui
```

### Verifying Coverage Targets
```bash
npm run test:coverage

# Check if meets thresholds:
# Lines: 80%
# Functions: 80%
# Branches: 75%
# Statements: 80%
```

## Writing New Tests

### 1. Create Test File
```javascript
const { describe, it, expect, beforeEach, afterEach, vi } = require('vitest');

describe('my-new-hook', () => {
  let consoleLogSpy;
  let processExitSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should pass valid input', () => {
    // Arrange
    const input = { event: 'PostToolUse', toolName: 'Edit' };

    // Act
    // ... test logic

    // Assert
    expect(result).toBe(expected);
  });
});
```

### 2. Run Your New Test
```bash
npx vitest run my-new-hook.test.js
```

### 3. Check Coverage
```bash
npx vitest run my-new-hook.test.js --coverage
```

## Test Utilities Available

### Mock Helpers
```javascript
const {
  createMockStdin,
  mockStdinWithData,
  mockConsoleLog,
  mockProcessExit,
  createHookTestEnv
} = require('../helpers/test-utils');
```

### Input Factories
```javascript
const {
  createEditInput,
  createWriteInput,
  createBashInput
} = require('../helpers/test-utils');

const input = createEditInput('/path/to/file.ts', 'old', 'new');
```

### Assertions
```javascript
const {
  assertOkResponse,
  assertBlockedResponse
} = require('../helpers/test-utils');

assertOkResponse(response);
assertBlockedResponse(response, 'Expected error message');
```

## Troubleshooting

### Tests Hanging
**Problem**: Test never completes
**Solution**: Check for missing `done()` callback in async tests
```javascript
it('should handle async', (done) => {
  // ... async operation
  setTimeout(() => {
    expect(result).toBe(expected);
    done(); // Don't forget this!
  }, 50);
});
```

### Mock Not Working
**Problem**: Real function is being called
**Solution**: Ensure mock is created BEFORE module import
```javascript
beforeEach(() => {
  fsExistsSyncSpy = vi.spyOn(fs, 'existsSync'); // Create mock first
});

// Then load module that uses fs
require('../../typescript-react/hook.js');
```

### Module Cache Issues
**Problem**: Old module version in memory
**Solution**: Clear cache in afterEach
```javascript
afterEach(() => {
  delete require.cache[require.resolve('../../typescript-react/hook.js')];
});
```

### Coverage Not Accurate
**Problem**: Coverage shows 0% or incorrect numbers
**Solution**: Check vitest.config.js includes/excludes
```javascript
coverage: {
  include: ['typescript-react/**/*.js'],
  exclude: ['**/*.test.js', 'tests/**']
}
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### GitLab CI Example
```yaml
test:
  image: node:18
  script:
    - npm install
    - npm test
    - npm run test:coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## Best Practices

### DO ✅
- Run tests before committing
- Write tests for new features
- Keep tests isolated and independent
- Use descriptive test names
- Mock external dependencies
- Clean up mocks in afterEach
- Target 80%+ coverage

### DON'T ❌
- Commit failing tests
- Skip tests with `.skip()` (fix or remove)
- Use real file system or network in tests
- Share state between tests
- Forget to restore mocks
- Ignore coverage drops
- Write tests that depend on execution order

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests once |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | Generate coverage |
| `npm run test:ui` | Visual UI |
| `npx vitest run <file>` | Run specific file |
| `npx vitest run <pattern>` | Run matching pattern |

## Getting Help

- **Vitest Docs**: https://vitest.dev/
- **Test Utils**: See `tests/helpers/test-utils.js`
- **Test Examples**: See existing test files in `tests/unit/`
- **Test README**: See `tests/README.md`
- **Full Report**: See `TEST_REPORT.md`

---

Happy Testing! 🧪✅
