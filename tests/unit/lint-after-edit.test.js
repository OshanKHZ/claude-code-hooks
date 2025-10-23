import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Readable } from 'stream';
import { execSync } from 'child_process';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('lint-after-edit', () => {
  let consoleLogSpy;
  let processExitSpy;
  let processStdinSpy;
  let fsExistsSyncSpy;
  let execSyncSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    fsExistsSyncSpy = vi.spyOn(fs, 'existsSync');
    execSyncSpy = vi.spyOn(require('child_process'), 'execSync');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    fsExistsSyncSpy.mockRestore();
    execSyncSpy.mockRestore();
    if (processStdinSpy) {
      processStdinSpy.mockRestore();
    }
    delete require.cache[require.resolve('../../typescript-react/lint-after-edit.js')];
  });

  function createStdinMock(data) {
    const stdin = new Readable();
    stdin.push(JSON.stringify(data));
    stdin.push(null);
    return stdin;
  }

  function loadHookWithInput(inputData) {
    processStdinSpy = vi.spyOn(process, 'stdin', 'get').mockReturnValue(
      createStdinMock(inputData)
    );
    require('../../typescript-react/lint-after-edit.js');
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

  describe('Non-code files', () => {
    it('should skip JSON files', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/config.json' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should skip CSS files', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: { file_path: '/project/styles.css' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should skip markdown files', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/README.md' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });

  describe('Linting success', () => {
    it('should pass for valid TypeScript code', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/valid.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('Lint passou');
        expect(output.message).toContain('valid.ts');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should pass for valid JavaScript code', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: { file_path: '/project/src/valid.js' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('Lint passou');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should pass for JSX files', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/Component.jsx' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should pass for TSX files', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/Component.tsx' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should call eslint with --fix flag', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        expect(execSyncSpy).toHaveBeenCalledWith(
          expect.stringContaining('eslint'),
          expect.any(Object)
        );
        expect(execSyncSpy).toHaveBeenCalledWith(
          expect.stringContaining('--fix'),
          expect.any(Object)
        );
        done();
      }, 50);
    });
  });

  describe('Linting errors', () => {
    it('should block on unfixable ESLint errors', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/error.ts' }
      };

      const errorOutput = `
/project/src/error.ts
  10:5  error  'x' is defined but never used  @typescript-eslint/no-unused-vars
✖ 1 problem (1 error, 0 warnings)
      `;

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockImplementation(() => {
        const error = new Error();
        error.stdout = errorOutput;
        throw error;
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('ESLint encontrou erros');
        expect(output.message).toContain('error.ts');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should show error details in message', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/error.ts' }
      };

      const errorOutput = `
/project/src/error.ts
  10:5  error  Unexpected console statement  no-console
  15:3  error  Missing return type  @typescript-eslint/explicit-module-boundary-types
✖ 2 problems (2 errors, 0 warnings)
      `;

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockImplementation(() => {
        const error = new Error();
        error.stdout = errorOutput;
        throw error;
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('Unexpected console statement');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should include helpful suggestion', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/error.ts' }
      };

      const errorOutput = `
/project/src/error.ts
  10:5  error  Missing semicolon
✖ 1 problem
      `;

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockImplementation(() => {
        const error = new Error();
        error.stdout = errorOutput;
        throw error;
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('💡 Corrija os erros');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should truncate very long error output', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/error.ts' }
      };

      const longError = 'error '.repeat(200);

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockImplementation(() => {
        const error = new Error();
        error.stdout = longError;
        throw error;
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message.length).toBeLessThan(longError.length);
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent files', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/nonexistent.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(false);

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle ESLint not installed', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockImplementation(() => {
        throw new Error('eslint: command not found');
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('ESLint não disponível');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle ESLint configuration errors gracefully', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockImplementation(() => {
        const error = new Error('ESLint configuration error');
        error.stderr = 'Failed to load config';
        throw error;
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('ESLint não disponível');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });

  describe('ESLint execution options', () => {
    it('should use correct working directory', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        expect(execSyncSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            cwd: expect.any(String)
          })
        );
        done();
      }, 50);
    });

    it('should set appropriate timeout', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        expect(execSyncSpy).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            timeout: 30000
          })
        );
        done();
      }, 50);
    });
  });

  describe('Non-Edit/Write events', () => {
    it('should skip Read commands', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Read',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should skip Bash commands', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm test' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });

  describe('Edge cases', () => {
    it('should handle files with spaces in path', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/my file.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        expect(execSyncSpy).toHaveBeenCalledWith(
          expect.stringContaining('"'),
          expect.any(Object)
        );
        done();
      }, 50);
    });

    it('should handle empty file path', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });
});
