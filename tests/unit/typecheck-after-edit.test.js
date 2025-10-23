import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Readable } from 'stream';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('typecheck-after-edit', () => {
  let consoleLogSpy;
  let processExitSpy;
  let processStdinSpy;
  let fsExistsSyncSpy;
  let fsReadFileSyncSpy;
  let fsWriteFileSyncSpy;
  let execSyncSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    fsExistsSyncSpy = vi.spyOn(fs, 'existsSync');
    fsReadFileSyncSpy = vi.spyOn(fs, 'readFileSync');
    fsWriteFileSyncSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    execSyncSpy = vi.spyOn(require('child_process'), 'execSync');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    fsExistsSyncSpy.mockRestore();
    fsReadFileSyncSpy.mockRestore();
    fsWriteFileSyncSpy.mockRestore();
    execSyncSpy.mockRestore();
    if (processStdinSpy) {
      processStdinSpy.mockRestore();
    }
    delete require.cache[require.resolve('../../typescript-react/typecheck-after-edit.js')];
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
    require('../../typescript-react/typecheck-after-edit.js');
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

  describe('Non-TypeScript files', () => {
    it('should skip JavaScript files', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.js' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should skip JSON files', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
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
  });

  describe('TypeScript files', () => {
    it('should check .ts files', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/utils.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('utils.ts')) return 'export const x = 1;';
        if (filePath.includes('cache')) return JSON.stringify({ hashes: {}, fileToConfig: {} });
        return '';
      });
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('TypeScript');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should check .tsx files', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: { file_path: '/project/src/Component.tsx' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('Component.tsx')) return 'export const Component = () => <div />;';
        if (filePath.includes('cache')) return JSON.stringify({ hashes: {}, fileToConfig: {} });
        return '';
      });
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });

  describe('tsconfig.json detection', () => {
    it('should find tsconfig.json in project root', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      fsExistsSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('file.ts')) return true;
        if (filePath.includes('tsconfig.json')) return true;
        return false;
      });

      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('tsconfig.json')) {
          return JSON.stringify({ compilerOptions: {} });
        }
        if (filePath.includes('file.ts')) {
          return 'export const x = 1;';
        }
        if (filePath.includes('cache')) {
          return JSON.stringify({ hashes: {}, fileToConfig: {} });
        }
        return '';
      });

      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle missing tsconfig.json', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      fsExistsSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('file.ts')) return true;
        return false;
      });

      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('file.ts')) return 'const x = 1;';
        if (filePath.includes('cache')) return JSON.stringify({ hashes: {}, fileToConfig: {} });
        return '';
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('No tsconfig.json found');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });

  describe('Type checking success', () => {
    it('should pass for valid TypeScript code', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/valid.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('valid.ts')) return 'const x: number = 123;';
        if (filePath.includes('cache')) return JSON.stringify({ hashes: {}, fileToConfig: {} });
        return '';
      });
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('✅');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should show incremental flag on cached success', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('file.ts')) return 'const x = 1;';
        if (filePath.includes('cache')) return JSON.stringify({ hashes: {}, fileToConfig: {} });
        return '';
      });
      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('incremental');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });

  describe('Type checking errors', () => {
    it('should block on type errors in edited file', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/error.ts' }
      };

      const errorOutput = `
/project/src/error.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.
      `;

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('error.ts')) return 'const x: number = "string";';
        if (filePath.includes('cache')) return JSON.stringify({ hashes: {}, fileToConfig: {} });
        return '';
      });
      execSyncSpy.mockImplementation(() => {
        const error = new Error();
        error.stdout = errorOutput;
        throw error;
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('TypeScript errors');
        expect(output.message).toContain('error.ts');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should parse error line, column, and message', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/error.ts' }
      };

      const errorOutput = `
/project/src/error.ts(15,20): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
      `;

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue('');
      execSyncSpy.mockImplementation(() => {
        const error = new Error();
        error.stdout = errorOutput;
        throw error;
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.details.errors).toBeDefined();
        expect(output.details.errors[0]).toMatchObject({
          line: 15,
          column: 20,
          code: 'error TS2345'
        });
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should filter errors to only show edited file', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/edited.ts' }
      };

      const errorOutput = `
/project/src/edited.ts(10,5): error TS2322: Type error in edited file.
/project/src/other.ts(20,10): error TS2345: Type error in dependency.
      `;

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue('');
      execSyncSpy.mockImplementation(() => {
        const error = new Error();
        error.stdout = errorOutput;
        throw error;
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('edited.ts');
        expect(output.message).not.toContain('other.ts');
        expect(output.details.dependencyErrors).toBe(1);
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should pass if errors are only in dependencies', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/edited.ts' }
      };

      const errorOutput = `
/project/src/other.ts(20,10): error TS2345: Type error in dependency.
      `;

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue('');
      execSyncSpy.mockImplementation(() => {
        const error = new Error();
        error.stdout = errorOutput;
        throw error;
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('errors in dependencies');
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });

  describe('Caching mechanism', () => {
    it('should use cached result for unchanged file', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/cached.ts' }
      };

      const fileContent = 'const x = 1;';
      const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('cached.ts')) return fileContent;
        if (filePath.includes('results-cache')) {
          return JSON.stringify({
            '/project/src/cached.ts': {
              hash: fileHash,
              timestamp: Date.now(),
              result: {
                success: true,
                message: 'Cached success'
              }
            }
          });
        }
        if (filePath.includes('config.json')) {
          return JSON.stringify({ typescript: { enabled: true } });
        }
        if (filePath.includes('cache') || filePath.includes('.json')) {
          return JSON.stringify({ hashes: {}, fileToConfig: {} });
        }
        return '';
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('cached');
        expect(execSyncSpy).not.toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should invalidate cache after 1 hour', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/old.ts' }
      };

      const fileContent = 'const x = 1;';
      const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
      const oldTimestamp = Date.now() - (3600000 + 1000); // 1 hour + 1 second ago

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('old.ts')) return fileContent;
        if (filePath.includes('results-cache')) {
          return JSON.stringify({
            '/project/src/old.ts': {
              hash: fileHash,
              timestamp: oldTimestamp,
              result: {
                success: true,
                message: 'Old cached success'
              }
            }
          });
        }
        if (filePath.includes('config.json')) {
          return JSON.stringify({ typescript: { enabled: true } });
        }
        if (filePath.includes('cache') || filePath.includes('.json')) {
          return JSON.stringify({ hashes: {}, fileToConfig: {} });
        }
        return '';
      });

      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(execSyncSpy).toHaveBeenCalled(); // Should run typecheck, not use cache
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should invalidate cache when file content changes', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/changed.ts' }
      };

      const newContent = 'const x = 2;'; // Changed
      const oldHash = crypto.createHash('sha256').update('const x = 1;').digest('hex');

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('changed.ts')) return newContent;
        if (filePath.includes('results-cache')) {
          return JSON.stringify({
            '/project/src/changed.ts': {
              hash: oldHash,
              timestamp: Date.now(),
              result: {
                success: true,
                message: 'Old cached success'
              }
            }
          });
        }
        if (filePath.includes('config.json')) {
          return JSON.stringify({ typescript: { enabled: true } });
        }
        if (filePath.includes('cache') || filePath.includes('.json')) {
          return JSON.stringify({ hashes: {}, fileToConfig: {} });
        }
        return '';
      });

      execSyncSpy.mockReturnValue('');

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(execSyncSpy).toHaveBeenCalled(); // Should run typecheck
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });

  describe('Error handling', () => {
    it('should handle non-existent files gracefully', (done) => {
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

    it('should handle TypeScript check failure gracefully', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue('');
      execSyncSpy.mockImplementation(() => {
        throw new Error('TypeScript not installed');
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('ok');
        expect(output.message).toContain('TypeScript check failed');
        expect(processExitSpy).toHaveBeenCalledWith(0);
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
        toolInput: { command: 'git status' }
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
