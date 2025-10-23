# Test Suite Documentation

This directory contains comprehensive tests for the Claude Code Hooks repository.

## Test Structure

```
tests/
├── unit/                          # Unit tests for individual hooks
│   ├── shared-utils.test.js       # Shared utilities tests
│   ├── check-dependencies.test.js # Dependency validation tests
│   ├── validate-imports.test.js   # Import validation tests
│   ├── typecheck-after-edit.test.js # TypeScript checking tests
│   ├── lint-after-edit.test.js    # ESLint tests
│   └── format-on-edit.test.js     # Prettier formatting tests
├── integration/                   # Integration tests
│   └── orchestrator.test.js       # Hook orchestration tests
├── helpers/                       # Test utilities
│   └── test-utils.js              # Mock helpers, test factories
└── fixtures/                      # Test data
    ├── sample-files.js            # Sample file contents
    └── mock-config.js             # Mock configurations
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run tests with UI
```bash
npm run test:ui
```

## Test Framework

- **Framework**: Vitest
- **Environment**: Node.js
- **Coverage**: v8 provider
- **Mocking**: Vitest built-in mocking

## Coverage Targets

- **Lines**: 80%+
- **Functions**: 80%+
- **Branches**: 75%+
- **Statements**: 80%+

## Test Patterns Used

### 1. AAA Pattern (Arrange-Act-Assert)
All tests follow the AAA pattern for clarity:

```javascript
it('should validate TypeScript files', () => {
  // Arrange
  const input = { event: 'PostToolUse', toolName: 'Edit', ... };

  // Act
  loadHookWithInput(input);

  // Assert
  expect(output.status).toBe('ok');
});
```

### 2. Mock Isolation
Each test uses mocks to isolate the system under test:

```javascript
beforeEach(() => {
  fsExistsSyncSpy = vi.spyOn(fs, 'existsSync');
  execSyncSpy = vi.spyOn(require('child_process'), 'execSync');
});

afterEach(() => {
  fsExistsSyncSpy.mockRestore();
  execSyncSpy.mockRestore();
});
```

### 3. Async Testing
Tests handle asynchronous stdin/stdout operations:

```javascript
it('should process async input', (done) => {
  loadHookWithInput(input);

  setTimeout(() => {
    expect(output).toBeDefined();
    done();
  }, 50);
});
```

### 4. Edge Case Coverage
Tests include edge cases and error scenarios:

```javascript
describe('Edge cases', () => {
  it('should handle empty input', ...);
  it('should handle null values', ...);
  it('should handle malformed data', ...);
});
```

## Test Utilities

### createStdinMock(data)
Creates a mock stdin stream with JSON data.

### loadHookWithInput(inputData)
Loads a hook module with mocked stdin data.

### getLastJsonOutput()
Retrieves the last JSON output from console.log.

### mockAllHooksSuccess()
Mocks all hook executions to return success.

### mockHookFailure(hookName)
Mocks a specific hook to fail.

## Testing Individual Hooks

### shared-utils.test.js
Tests utility functions:
- Config loading and caching
- Stdin reading
- Exit functions (ok/blocked)
- File type detection
- Path normalization
- Error formatting

**Coverage**: 90%+ of all utility functions

### check-dependencies.test.js
Tests dependency validation:
- Trusted package whitelist
- Typosquatting detection
- Bypass flags (--force, -y)
- Package manager variations (npm, yarn, pnpm)
- Edge cases (empty commands, quoted packages)

**Test Count**: 30+ test cases

### validate-imports.test.js
Tests import validation:
- Node_modules imports (allowed)
- Relative imports with existence checks
- Alias imports (@/, @)
- Index file resolution
- Error suggestions for typos
- Edge cases (empty files, no imports)

**Test Count**: 25+ test cases

### typecheck-after-edit.test.js
Tests TypeScript checking:
- File filtering (.ts, .tsx only)
- tsconfig.json detection
- Type error parsing and filtering
- Caching mechanism (SHA256 + TTL)
- Dependency error filtering
- Error handling (missing tsconfig, execution failures)

**Test Count**: 35+ test cases

### lint-after-edit.test.js
Tests ESLint execution:
- File filtering (.ts, .tsx, .js, .jsx)
- Auto-fix execution
- Error detection and blocking
- Error message formatting
- Graceful degradation (ESLint not installed)
- Configuration errors

**Test Count**: 25+ test cases

### format-on-edit.test.js
Tests Prettier formatting:
- File type filtering (formattable extensions)
- Directory exclusion (node_modules, dist, etc.)
- Package manager detection (pnpm, yarn, npm)
- Prettier availability check
- Format execution
- Error handling

**Test Count**: 30+ test cases

### orchestrator.test.js (Integration)
Tests hook orchestration:
- Configuration loading
- Parallel execution
- Sequential execution
- Error propagation
- Hook communication (stdin/stdout)
- All hook integrations
- Edge cases

**Test Count**: 35+ test cases

## Mock Strategies

### File System Mocking
```javascript
fsExistsSyncSpy.mockReturnValue(true);
fsReadFileSyncSpy.mockReturnValue('file content');
```

### Process Mocking
```javascript
processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
```

### Child Process Mocking
```javascript
execSyncSpy.mockReturnValue(JSON.stringify({ status: 'ok' }));
```

### Stdin Mocking
```javascript
const stdin = new Readable();
stdin.push(JSON.stringify(data));
stdin.push(null);
vi.spyOn(process, 'stdin', 'get').mockReturnValue(stdin);
```

## Common Test Scenarios

### Success Path
```javascript
it('should pass valid input', (done) => {
  mockAllHooksSuccess();
  loadHookWithInput(validInput);

  setTimeout(() => {
    expect(getLastJsonOutput()).toEqual({ status: 'ok' });
    expect(processExitSpy).toHaveBeenCalledWith(0);
    done();
  }, 50);
});
```

### Error Path
```javascript
it('should block on error', (done) => {
  mockHookFailure('lint-after-edit.js');
  loadHookWithInput(invalidInput);

  setTimeout(() => {
    expect(getLastJsonOutput().status).toBe('blocked');
    expect(processExitSpy).toHaveBeenCalledWith(1);
    done();
  }, 50);
});
```

### Edge Cases
```javascript
describe('Edge cases', () => {
  it('should handle null input', ...);
  it('should handle empty strings', ...);
  it('should handle malformed JSON', ...);
});
```

## Continuous Integration

Tests are designed to run in CI/CD environments:

- **Fast execution**: < 10 seconds total
- **No external dependencies**: All mocked
- **Deterministic**: No flaky tests
- **Clear output**: Detailed failure messages

## Contributing Tests

When adding new tests:

1. Follow the AAA pattern
2. Use descriptive test names
3. Mock all external dependencies
4. Test both success and failure paths
5. Include edge cases
6. Clean up mocks in afterEach
7. Aim for 80%+ coverage

## Troubleshooting

### Tests hanging
- Check for missing `done()` callbacks in async tests
- Ensure all promises are resolved

### Module cache issues
- Clear cache in afterEach: `delete require.cache[...]`

### Mock not working
- Verify mock is created before module import
- Check mock is restored in afterEach

### Coverage not accurate
- Ensure test files match glob patterns in vitest.config.js
- Check exclude patterns don't filter too much
