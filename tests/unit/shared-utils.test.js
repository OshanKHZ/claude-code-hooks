import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Import module under test
import * as sharedUtils from '../../typescript-react/shared-utils.js';

describe('shared-utils', () => {
  describe('loadConfig', () => {
    let fsExistsSyncSpy;
    let fsReadFileSyncSpy;
    let consoleErrorSpy;

    beforeEach(() => {
      // Reset module cache to test config loading
      delete require.cache[require.resolve('../../typescript-react/shared-utils')];
      fsExistsSyncSpy = vi.spyOn(fs, 'existsSync');
      fsReadFileSyncSpy = vi.spyOn(fs, 'readFileSync');
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      fsExistsSyncSpy.mockRestore();
      fsReadFileSyncSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should load config from file when it exists', () => {
      const mockConfig = {
        typescript: { enabled: true },
        eslint: { enabled: true }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify(mockConfig));

      const utils = require('../../typescript-react/shared-utils');
      const config = utils.loadConfig();

      expect(config).toEqual(mockConfig);
      expect(fsReadFileSyncSpy).toHaveBeenCalled();
    });

    it('should return default config when file does not exist', () => {
      fsExistsSyncSpy.mockReturnValue(false);

      const utils = require('../../typescript-react/shared-utils');
      const config = utils.loadConfig();

      expect(config).toHaveProperty('typescript');
      expect(config).toHaveProperty('eslint');
      expect(config).toHaveProperty('prettier');
      expect(config).toHaveProperty('imports');
      expect(config).toHaveProperty('dependencies');
      expect(config).toHaveProperty('orchestrator');

      expect(config.typescript.enabled).toBe(true);
      expect(config.orchestrator.parallel).toBe(true);
    });

    it('should return default config when file read fails', () => {
      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockImplementation(() => {
        throw new Error('File read error');
      });

      const utils = require('../../typescript-react/shared-utils');
      const config = utils.loadConfig();

      expect(config).toHaveProperty('typescript');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should cache config after first load', () => {
      fsExistsSyncSpy.mockReturnValue(false);

      const utils = require('../../typescript-react/shared-utils');
      const config1 = utils.loadConfig();
      const config2 = utils.loadConfig();

      expect(config1).toBe(config2); // Same reference
    });
  });

  describe('readStdin', () => {
    it('should read and parse JSON from stdin', async () => {
      const testData = { event: 'PostToolUse', toolName: 'Edit' };
      const stdin = new Readable();
      stdin.push(JSON.stringify(testData));
      stdin.push(null);

      vi.spyOn(process, 'stdin', 'get').mockReturnValue(stdin);

      const result = await sharedUtils.readStdin();

      expect(result).toEqual(testData);
    });

    it('should handle empty stdin', async () => {
      const stdin = new Readable();
      stdin.push('{}');
      stdin.push(null);

      vi.spyOn(process, 'stdin', 'get').mockReturnValue(stdin);

      const result = await sharedUtils.readStdin();

      expect(result).toEqual({});
    });
  });

  describe('exitOk', () => {
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

    it('should output ok status without message', () => {
      sharedUtils.exitOk();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({ status: 'ok' })
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output ok status with message', () => {
      const message = 'All checks passed';
      sharedUtils.exitOk(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({ status: 'ok', message })
      );
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('exitBlocked', () => {
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

    it('should output blocked status with message', () => {
      const message = 'Validation failed';
      sharedUtils.exitBlocked(message);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({ status: 'blocked', message })
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('should output blocked status with message and details', () => {
      const message = 'Validation failed';
      const details = { errors: ['Error 1', 'Error 2'] };
      sharedUtils.exitBlocked(message, details);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({ status: 'blocked', message, details })
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('isTypeScriptFile', () => {
    it('should return true for .ts files', () => {
      expect(sharedUtils.isTypeScriptFile('file.ts')).toBe(true);
    });

    it('should return true for .tsx files', () => {
      expect(sharedUtils.isTypeScriptFile('component.tsx')).toBe(true);
    });

    it('should return false for .js files', () => {
      expect(sharedUtils.isTypeScriptFile('file.js')).toBe(false);
    });

    it('should return false for .jsx files', () => {
      expect(sharedUtils.isTypeScriptFile('component.jsx')).toBe(false);
    });

    it('should return false for other file types', () => {
      expect(sharedUtils.isTypeScriptFile('file.json')).toBe(false);
      expect(sharedUtils.isTypeScriptFile('file.md')).toBe(false);
      expect(sharedUtils.isTypeScriptFile('file.css')).toBe(false);
    });

    it('should handle paths with directories', () => {
      expect(sharedUtils.isTypeScriptFile('/path/to/file.ts')).toBe(true);
      expect(sharedUtils.isTypeScriptFile('src/components/Button.tsx')).toBe(true);
    });
  });

  describe('isCodeFile', () => {
    it('should return true for TypeScript files', () => {
      expect(sharedUtils.isCodeFile('file.ts')).toBe(true);
      expect(sharedUtils.isCodeFile('file.tsx')).toBe(true);
    });

    it('should return true for JavaScript files', () => {
      expect(sharedUtils.isCodeFile('file.js')).toBe(true);
      expect(sharedUtils.isCodeFile('file.jsx')).toBe(true);
    });

    it('should return false for non-code files', () => {
      expect(sharedUtils.isCodeFile('file.json')).toBe(false);
      expect(sharedUtils.isCodeFile('file.md')).toBe(false);
      expect(sharedUtils.isCodeFile('file.css')).toBe(false);
      expect(sharedUtils.isCodeFile('file.html')).toBe(false);
    });
  });

  describe('getProjectRoot', () => {
    it('should return project root path', () => {
      const root = sharedUtils.getProjectRoot();
      expect(root).toBeDefined();
      expect(typeof root).toBe('string');
      expect(path.isAbsolute(root)).toBe(true);
    });
  });

  describe('normalizePath', () => {
    it('should normalize Windows paths', () => {
      const windowsPath = 'C:\\Users\\test\\file.ts';
      const normalized = sharedUtils.normalizePath(windowsPath);
      expect(normalized).toBe('C:/Users/test/file.ts');
    });

    it('should handle Unix paths', () => {
      const unixPath = '/home/user/file.ts';
      const normalized = sharedUtils.normalizePath(unixPath);
      expect(normalized).toBe('/home/user/file.ts');
    });

    it('should handle relative paths', () => {
      const relativePath = './src/components/Button.tsx';
      const normalized = sharedUtils.normalizePath(relativePath);
      expect(normalized).toContain('src/components/Button.tsx');
    });

    it('should handle mixed slashes', () => {
      const mixedPath = 'C:\\Users/test\\file.ts';
      const normalized = sharedUtils.normalizePath(mixedPath);
      expect(normalized).toBe('C:/Users/test/file.ts');
    });
  });

  describe('formatError', () => {
    it('should format error with file, line, and column', () => {
      const error = {
        file: 'file.ts',
        line: 10,
        column: 5,
        message: 'Type error'
      };

      const formatted = sharedUtils.formatError(error);

      expect(formatted).toContain('file.ts:10:5');
      expect(formatted).toContain('Type error');
      expect(formatted).toContain('❌');
    });

    it('should format error with error code', () => {
      const error = {
        file: 'file.ts',
        line: 10,
        column: 5,
        message: 'Type error',
        code: 'TS2322'
      };

      const formatted = sharedUtils.formatError(error);

      expect(formatted).toContain('(TS2322)');
    });

    it('should format error with suggestion', () => {
      const error = {
        file: 'file.ts',
        message: 'Type error',
        suggestion: 'Use string instead of number'
      };

      const formatted = sharedUtils.formatError(error);

      expect(formatted).toContain('💡 Use string instead of number');
    });

    it('should format error without line and column', () => {
      const error = {
        file: 'file.ts',
        message: 'Type error'
      };

      const formatted = sharedUtils.formatError(error);

      expect(formatted).toContain('file.ts');
      expect(formatted).toContain('Type error');
      expect(formatted).not.toContain(':undefined');
    });

    it('should format error with all fields', () => {
      const error = {
        file: 'file.ts',
        line: 10,
        column: 5,
        message: 'Type error',
        code: 'TS2322',
        suggestion: 'Use correct type'
      };

      const formatted = sharedUtils.formatError(error);

      expect(formatted).toContain('file.ts:10:5');
      expect(formatted).toContain('Type error');
      expect(formatted).toContain('(TS2322)');
      expect(formatted).toContain('💡 Use correct type');
    });
  });
});
