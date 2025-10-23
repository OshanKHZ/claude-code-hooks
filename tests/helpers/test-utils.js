import { Readable } from 'stream';
import { vi } from 'vitest';

/**
 * Create a mock stdin stream with JSON data
 */
function createMockStdin(data) {
  const stdin = new Readable();
  stdin.push(JSON.stringify(data));
  stdin.push(null);
  return stdin;
}

/**
 * Mock stdin for hooks that read from process.stdin
 */
function mockStdinWithData(data) {
  const mockStdin = createMockStdin(data);
  vi.spyOn(process, 'stdin', 'get').mockReturnValue(mockStdin);
  return mockStdin;
}

/**
 * Mock stdout to capture output
 */
function mockStdout() {
  const output = [];
  const originalStdoutWrite = process.stdout.write;

  process.stdout.write = vi.fn((chunk) => {
    output.push(chunk.toString());
    return true;
  });

  return {
    output,
    restore: () => {
      process.stdout.write = originalStdoutWrite;
    },
    getOutput: () => output.join(''),
    getLastOutput: () => output[output.length - 1] || '',
    clear: () => output.length = 0
  };
}

/**
 * Mock console.log to capture JSON output from hooks
 */
function mockConsoleLog() {
  const logs = [];
  const originalLog = console.log;

  console.log = vi.fn((message) => {
    logs.push(message);
  });

  return {
    logs,
    restore: () => {
      console.log = originalLog;
    },
    getLastLog: () => logs[logs.length - 1] || '',
    getLastJson: () => {
      const last = logs[logs.length - 1] || '';
      try {
        return JSON.parse(last);
      } catch {
        return null;
      }
    },
    getAllLogs: () => logs,
    clear: () => logs.length = 0
  };
}

/**
 * Mock process.exit to prevent actual exits during tests
 */
function mockProcessExit() {
  const exitCodes = [];
  const originalExit = process.exit;

  process.exit = vi.fn((code) => {
    exitCodes.push(code);
    // Throw error to stop execution without actually exiting
    throw new Error(`Process.exit called with code ${code}`);
  });

  return {
    exitCodes,
    restore: () => {
      process.exit = originalExit;
    },
    getLastExitCode: () => exitCodes[exitCodes.length - 1],
    wasCalledWithCode: (code) => exitCodes.includes(code),
    clear: () => exitCodes.length = 0
  };
}

/**
 * Create a complete hook test environment
 */
function createHookTestEnv() {
  const consoleLogMock = mockConsoleLog();
  const exitMock = mockProcessExit();

  return {
    stdin: mockStdinWithData,
    console: consoleLogMock,
    exit: exitMock,
    cleanup: () => {
      consoleLogMock.restore();
      exitMock.restore();
    },
    getResponse: () => consoleLogMock.getLastJson(),
    getExitCode: () => exitMock.getLastExitCode()
  };
}

/**
 * Run a hook with test data and capture output
 */
async function runHook(hookModule, inputData, options = {}) {
  const env = createHookTestEnv();

  try {
    env.stdin(inputData);

    // Wait for stdin processing
    await new Promise((resolve) => setTimeout(resolve, options.delay || 10));

    return {
      response: env.getResponse(),
      exitCode: env.getExitCode(),
      logs: env.console.getAllLogs(),
      success: env.getExitCode() === 0
    };
  } catch (error) {
    // Process.exit throws, which is expected
    if (!error.message.includes('Process.exit')) {
      throw error;
    }

    return {
      response: env.getResponse(),
      exitCode: env.getExitCode(),
      logs: env.console.getAllLogs(),
      success: env.getExitCode() === 0
    };
  } finally {
    env.cleanup();
  }
}

/**
 * Create mock hook input data
 */
function createHookInput(toolName, toolInput, event = 'PostToolUse') {
  return {
    event,
    toolName,
    toolInput
  };
}

/**
 * Create Edit tool input
 */
function createEditInput(filePath, oldString, newString) {
  return createHookInput('Edit', {
    file_path: filePath,
    old_string: oldString,
    new_string: newString
  });
}

/**
 * Create Write tool input
 */
function createWriteInput(filePath, content) {
  return createHookInput('Write', {
    file_path: filePath,
    content
  });
}

/**
 * Create Bash tool input
 */
function createBashInput(command) {
  return createHookInput('Bash', {
    command
  });
}

/**
 * Assert hook response is ok
 */
function assertOkResponse(response) {
  if (!response) {
    throw new Error('No response received from hook');
  }
  if (response.status !== 'ok') {
    throw new Error(`Expected status 'ok' but got '${response.status}': ${response.message}`);
  }
}

/**
 * Assert hook response is blocked
 */
function assertBlockedResponse(response, expectedMessage) {
  if (!response) {
    throw new Error('No response received from hook');
  }
  if (response.status !== 'blocked') {
    throw new Error(`Expected status 'blocked' but got '${response.status}'`);
  }
  if (expectedMessage && !response.message.includes(expectedMessage)) {
    throw new Error(`Expected message to contain '${expectedMessage}' but got: ${response.message}`);
  }
}

export {
  createMockStdin,
  mockStdinWithData,
  mockStdout,
  mockConsoleLog,
  mockProcessExit,
  createHookTestEnv,
  runHook,
  createHookInput,
  createEditInput,
  createWriteInput,
  createBashInput,
  assertOkResponse,
  assertBlockedResponse
};
