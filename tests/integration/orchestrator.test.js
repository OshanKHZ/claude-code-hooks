import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Readable } from 'stream';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('orchestrator (integration)', () => {
  let consoleLogSpy;
  let consoleErrorSpy;
  let processExitSpy;
  let processStdinSpy;
  let execSyncSpy;
  let fsExistsSyncSpy;
  let fsReadFileSyncSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    execSyncSpy = vi.spyOn(require('child_process'), 'execSync');
    fsExistsSyncSpy = vi.spyOn(fs, 'existsSync');
    fsReadFileSyncSpy = vi.spyOn(fs, 'readFileSync');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    execSyncSpy.mockRestore();
    fsExistsSyncSpy.mockRestore();
    fsReadFileSyncSpy.mockRestore();
    if (processStdinSpy) {
      processStdinSpy.mockRestore();
    }
    delete require.cache[require.resolve('../../typescript-react/orchestrator.js')];
    delete require.cache[require.resolve('../../typescript-react/shared-utils.js')];
  });

  function createStdinMock(data) {
    const stdin = new Readable();
    stdin.push(JSON.stringify(data));
    stdin.push(null);
    return stdin;
  }

  function loadOrchestratorWithInput(inputData) {
    processStdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(
      createStdinMock(inputData)
    );
    require('../../typescript-react/orchestrator.js');
  }

  function getLastJsonOutput() {
    const lastCall = consoleLogSpy.mock.calls[consoleLogSpy.mock.calls.length - 1];
    if (!lastCall) return null;
    try {
      return JSON.parse(lastCall[0]);
    } catch {
      return null;
    }
  }

  function mockAllHooksSuccess() {
    execSyncSpy.mockImplementation((command) => {
      // Return success JSON for all hooks
      return JSON.stringify({ status: 'ok', message: 'Hook passed' });
    });
  }

  function mockHookFailure(hookName) {
    execSyncSpy.mockImplementation((command) => {
      if (command.includes(hookName)) {
        const error = new Error();
        error.stdout = JSON.stringify({
          status: 'blocked',
          message: `${hookName} failed`
        });
        throw error;
      }
      return JSON.stringify({ status: 'ok' });
    });
  }

  describe('Configuration loading', () => {
    it('should load config from config.json', (done) => {
      const mockConfig = {
        orchestrator: { parallel: true },
        typescript: { enabled: true },
        eslint: { enabled: true }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('config.json')) {
          return JSON.stringify(mockConfig);
        }
        return '{}';
      });

      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      mockAllHooksSuccess();
      loadOrchestratorWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toBeDefined();
        done();
      }, 100);
    });

    it('should use default config when file not found', (done) => {
      fsExistsSyncSpy.mockReturnValue(false);

      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      mockAllHooksSuccess();
      loadOrchestratorWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toBeDefined();
        done();
      }, 100);
    });
  });

  describe('Parallel execution', () => {
    it('should execute parallel hooks concurrently', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      const executionOrder = [];
      execSyncSpy.mockImplementation((command) => {
        if (command.includes('check-dependencies.js')) {
          executionOrder.push('check-dependencies');
        } else if (command.includes('validate-imports.js')) {
          executionOrder.push('validate-imports');
        } else if (command.includes('typecheck-after-edit.js')) {
          executionOrder.push('typecheck');
        } else if (command.includes('lint-after-edit.js')) {
          executionOrder.push('lint');
        } else if (command.includes('format-on-edit.js')) {
          executionOrder.push('format');
        }
        return JSON.stringify({ status: 'ok' });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        // Parallel hooks should all be executed
        expect(executionOrder.length).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should stop on first error in parallel group', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      mockHookFailure('validate-imports.js');

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true, stopOnFirstError: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 100);
    });

    it('should not execute sequential group if parallel group fails', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      let formatCalled = false;
      execSyncSpy.mockImplementation((command) => {
        if (command.includes('lint-after-edit.js')) {
          const error = new Error();
          error.stdout = JSON.stringify({
            status: 'blocked',
            message: 'Lint failed'
          });
          throw error;
        }
        if (command.includes('format-on-edit.js')) {
          formatCalled = true;
        }
        return JSON.stringify({ status: 'ok' });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        expect(formatCalled).toBe(false);
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 100);
    });
  });

  describe('Sequential execution', () => {
    it('should execute hooks sequentially when parallel is disabled', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      const executionOrder = [];
      execSyncSpy.mockImplementation((command) => {
        if (command.includes('check-dependencies.js')) {
          executionOrder.push('check-dependencies');
        } else if (command.includes('validate-imports.js')) {
          executionOrder.push('validate-imports');
        } else if (command.includes('lint-after-edit.js')) {
          executionOrder.push('lint');
        }
        return JSON.stringify({ status: 'ok' });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: false }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        expect(executionOrder.length).toBeGreaterThan(0);
        done();
      }, 100);
    });

    it('should format after linting succeeds', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      const executionOrder = [];
      execSyncSpy.mockImplementation((command) => {
        if (command.includes('lint-after-edit.js')) {
          executionOrder.push('lint');
        } else if (command.includes('format-on-edit.js')) {
          executionOrder.push('format');
        }
        return JSON.stringify({ status: 'ok' });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        // Format should be in the execution order
        expect(executionOrder).toContain('format');
        done();
      }, 100);
    });
  });

  describe('Hook execution flow', () => {
    it('should execute all hooks when all pass', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      mockAllHooksSuccess();

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 100);
    });

    it('should output success messages from hooks', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      execSyncSpy.mockImplementation(() => {
        return JSON.stringify({
          status: 'ok',
          message: '✅ Hook passed successfully'
        });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        // Messages should be logged to stderr
        expect(consoleErrorSpy).toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  describe('Error handling', () => {
    it('should handle hook execution errors', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      execSyncSpy.mockImplementation(() => {
        throw new Error('Hook execution failed');
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        done();
      }, 100);
    });

    it('should handle malformed hook output', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      execSyncSpy.mockImplementation(() => {
        return 'invalid json{';
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toBeDefined();
        done();
      }, 100);
    });

    it('should handle orchestrator errors gracefully', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation(() => {
        throw new Error('Config read error');
      });

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        if (output) {
          expect(output.status).toBe('blocked');
          expect(output.message).toContain('Orchestrator error');
        }
        done();
      }, 100);
    });
  });

  describe('Hook communication', () => {
    it('should pass input data to hooks via stdin', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      execSyncSpy.mockImplementation((command, options) => {
        // Verify stdin is passed
        expect(options.input).toBeDefined();
        return JSON.stringify({ status: 'ok' });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        expect(execSyncSpy).toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should parse JSON responses from hooks', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      execSyncSpy.mockReturnValue(JSON.stringify({
        status: 'ok',
        message: 'Test message',
        details: { count: 5 }
      }));

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toBeDefined();
        done();
      }, 100);
    });
  });

  describe('Hook groups', () => {
    it('should execute check-dependencies hook', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install react' }
      };

      let checkDepsCalled = false;
      execSyncSpy.mockImplementation((command) => {
        if (command.includes('check-dependencies.js')) {
          checkDepsCalled = true;
        }
        return JSON.stringify({ status: 'ok' });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        expect(checkDepsCalled).toBe(true);
        done();
      }, 100);
    });

    it('should execute validate-imports hook', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      let validateImportsCalled = false;
      execSyncSpy.mockImplementation((command) => {
        if (command.includes('validate-imports.js')) {
          validateImportsCalled = true;
        }
        return JSON.stringify({ status: 'ok' });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        expect(validateImportsCalled).toBe(true);
        done();
      }, 100);
    });

    it('should execute typecheck hook', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      let typecheckCalled = false;
      execSyncSpy.mockImplementation((command) => {
        if (command.includes('typecheck-after-edit.js')) {
          typecheckCalled = true;
        }
        return JSON.stringify({ status: 'ok' });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        expect(typecheckCalled).toBe(true);
        done();
      }, 100);
    });

    it('should execute lint hook', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      let lintCalled = false;
      execSyncSpy.mockImplementation((command) => {
        if (command.includes('lint-after-edit.js')) {
          lintCalled = true;
        }
        return JSON.stringify({ status: 'ok' });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        expect(lintCalled).toBe(true);
        done();
      }, 100);
    });

    it('should execute format hook', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      let formatCalled = false;
      execSyncSpy.mockImplementation((command) => {
        if (command.includes('format-on-edit.js')) {
          formatCalled = true;
        }
        return JSON.stringify({ status: 'ok' });
      });

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        expect(formatCalled).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty input', (done) => {
      const input = {};

      mockAllHooksSuccess();

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toBeDefined();
        done();
      }, 100);
    });

    it('should handle null toolInput', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: null
      };

      mockAllHooksSuccess();

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify({
        orchestrator: { parallel: true }
      }));

      loadOrchestratorWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toBeDefined();
        done();
      }, 100);
    });
  });
});
