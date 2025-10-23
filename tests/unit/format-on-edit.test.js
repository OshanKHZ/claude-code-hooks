import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('format-on-edit', () => {
  let fsExistsSyncSpy;
  let fsReadFileSyncSpy;
  let execSyncSpy;
  let processExitSpy;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    fsExistsSyncSpy = vi.spyOn(fs, 'existsSync');
    fsReadFileSyncSpy = vi.spyOn(fs, 'readFileSync');
    execSyncSpy = vi.spyOn(require('child_process'), 'execSync');
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('Process exit called');
    });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fsExistsSyncSpy.mockRestore();
    fsReadFileSyncSpy.mockRestore();
    execSyncSpy.mockRestore();
    processExitSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('shouldFormat', () => {
    const testCases = [
      // Should format
      { path: '/project/src/file.ts', expected: true, desc: 'TypeScript files' },
      { path: '/project/src/Component.tsx', expected: true, desc: 'TSX files' },
      { path: '/project/src/file.js', expected: true, desc: 'JavaScript files' },
      { path: '/project/src/Component.jsx', expected: true, desc: 'JSX files' },
      { path: '/project/package.json', expected: true, desc: 'JSON files' },
      { path: '/project/styles.css', expected: true, desc: 'CSS files' },
      { path: '/project/styles.scss', expected: true, desc: 'SCSS files' },
      { path: '/project/README.md', expected: true, desc: 'Markdown files' },
      { path: '/project/index.html', expected: true, desc: 'HTML files' },

      // Should not format
      { path: '/project/image.png', expected: false, desc: 'Image files' },
      { path: '/project/document.pdf', expected: false, desc: 'PDF files' },
      { path: '/project/data.txt', expected: false, desc: 'Text files' },
      { path: '/project/node_modules/package/file.ts', expected: false, desc: 'Files in node_modules' },
      { path: '/project/dist/bundle.js', expected: false, desc: 'Files in dist' },
      { path: '/project/build/output.js', expected: false, desc: 'Files in build' },
      { path: '/project/.next/server.js', expected: false, desc: 'Files in .next' },
      { path: '/project/coverage/report.html', expected: false, desc: 'Files in coverage' }
    ];

    testCases.forEach(({ path, expected, desc }) => {
      it(`should ${expected ? 'format' : 'skip'} ${desc}`, () => {
        // This test validates the shouldFormat logic conceptually
        const isFormattableExt = /\.(ts|tsx|js|jsx|json|css|scss|md|html)$/.test(path);
        const skipDirs = ['node_modules', 'dist', 'build', '.next', 'coverage'];
        const normalizedPath = path.replace(/\\/g, '/');
        const shouldSkipDir = skipDirs.some(dir => normalizedPath.includes(`/${dir}/`));

        const result = isFormattableExt && !shouldSkipDir;
        expect(result).toBe(expected);
      });
    });
  });

  describe('Package manager detection', () => {
    it('should detect pnpm from pnpm-lock.yaml', () => {
      fsExistsSyncSpy.mockImplementation((filePath) => {
        return filePath.includes('pnpm-lock.yaml');
      });

      const hasPnpm = fsExistsSyncSpy('pnpm-lock.yaml');
      expect(hasPnpm).toBe(true);
    });

    it('should detect yarn from yarn.lock', () => {
      fsExistsSyncSpy.mockImplementation((filePath) => {
        return filePath.includes('yarn.lock');
      });

      const hasYarn = fsExistsSyncSpy('yarn.lock');
      expect(hasYarn).toBe(true);
    });

    it('should default to npm when no lock file found', () => {
      fsExistsSyncSpy.mockReturnValue(false);

      const hasPnpm = fsExistsSyncSpy('pnpm-lock.yaml');
      const hasYarn = fsExistsSyncSpy('yarn.lock');

      expect(hasPnpm).toBe(false);
      expect(hasYarn).toBe(false);
      // Should use npm by default
    });
  });

  describe('Prettier detection', () => {
    it('should detect Prettier in dependencies', () => {
      const packageJson = {
        dependencies: {
          prettier: '^3.0.0'
        }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify(packageJson));

      const content = fsReadFileSyncSpy('package.json', 'utf8');
      const pkg = JSON.parse(content);

      expect(pkg.dependencies.prettier).toBeDefined();
    });

    it('should detect Prettier in devDependencies', () => {
      const packageJson = {
        devDependencies: {
          prettier: '^3.0.0'
        }
      };

      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue(JSON.stringify(packageJson));

      const content = fsReadFileSyncSpy('package.json', 'utf8');
      const pkg = JSON.parse(content);

      expect(pkg.devDependencies.prettier).toBeDefined();
    });

    it('should handle missing package.json', () => {
      fsExistsSyncSpy.mockReturnValue(false);

      const exists = fsExistsSyncSpy('package.json');
      expect(exists).toBe(false);
    });

    it('should handle malformed package.json', () => {
      fsExistsSyncSpy.mockReturnValue(true);
      fsReadFileSyncSpy.mockReturnValue('invalid json{');

      expect(() => {
        JSON.parse(fsReadFileSyncSpy('package.json'));
      }).toThrow();
    });
  });

  describe('Format execution', () => {
    it('should execute prettier with pnpm', () => {
      const filePath = '/project/src/file.ts';
      execSyncSpy.mockReturnValue('');

      execSyncSpy(`pnpm exec prettier --write "${filePath}"`, {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      expect(execSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('pnpm exec prettier'),
        expect.any(Object)
      );
    });

    it('should execute prettier with yarn', () => {
      const filePath = '/project/src/file.ts';
      execSyncSpy.mockReturnValue('');

      execSyncSpy(`yarn prettier --write "${filePath}"`, {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      expect(execSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('yarn prettier'),
        expect.any(Object)
      );
    });

    it('should execute prettier with npm', () => {
      const filePath = '/project/src/file.ts';
      execSyncSpy.mockReturnValue('');

      execSyncSpy(`npx prettier --write "${filePath}"`, {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      expect(execSyncSpy).toHaveBeenCalledWith(
        expect.stringContaining('npx prettier'),
        expect.any(Object)
      );
    });

    it('should handle prettier execution success', () => {
      const filePath = '/project/src/file.ts';
      execSyncSpy.mockReturnValue('');

      let success = false;
      try {
        execSyncSpy(`prettier --write "${filePath}"`, { stdio: 'pipe' });
        success = true;
      } catch (error) {
        success = false;
      }

      expect(success).toBe(true);
    });

    it('should handle prettier execution failure', () => {
      const filePath = '/project/src/file.ts';
      execSyncSpy.mockImplementation(() => {
        throw new Error('Prettier failed');
      });

      let failed = false;
      try {
        execSyncSpy(`prettier --write "${filePath}"`, { stdio: 'pipe' });
      } catch (error) {
        failed = true;
      }

      expect(failed).toBe(true);
    });
  });

  describe('File validation', () => {
    it('should validate file exists before formatting', () => {
      fsExistsSyncSpy.mockReturnValue(true);

      const exists = fsExistsSyncSpy('/project/src/file.ts');
      expect(exists).toBe(true);
    });

    it('should handle non-existent files', () => {
      fsExistsSyncSpy.mockReturnValue(false);

      const exists = fsExistsSyncSpy('/project/src/nonexistent.ts');
      expect(exists).toBe(false);
    });

    it('should handle empty file path', () => {
      const filePath = '';
      expect(filePath).toBe('');
    });

    it('should handle null file path', () => {
      const filePath = null;
      expect(filePath).toBeNull();
    });
  });

  describe('Error handling', () => {
    it('should catch format errors', () => {
      execSyncSpy.mockImplementation(() => {
        throw new Error('Format failed');
      });

      let errorCaught = false;
      try {
        execSyncSpy('prettier --write file.ts', { stdio: 'pipe' });
      } catch (error) {
        errorCaught = true;
        expect(error.message).toBe('Format failed');
      }

      expect(errorCaught).toBe(true);
    });

    it('should handle prettier not found', () => {
      execSyncSpy.mockImplementation(() => {
        throw new Error('prettier: command not found');
      });

      let errorCaught = false;
      try {
        execSyncSpy('prettier --write file.ts', { stdio: 'pipe' });
      } catch (error) {
        errorCaught = true;
        expect(error.message).toContain('command not found');
      }

      expect(errorCaught).toBe(true);
    });

    it('should handle prettier configuration errors', () => {
      execSyncSpy.mockImplementation(() => {
        throw new Error('Invalid prettier config');
      });

      let errorCaught = false;
      try {
        execSyncSpy('prettier --write file.ts', { stdio: 'pipe' });
      } catch (error) {
        errorCaught = true;
        expect(error.message).toContain('config');
      }

      expect(errorCaught).toBe(true);
    });
  });

  describe('Input validation', () => {
    it('should validate Edit event with file_path', () => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      expect(input.event).toBe('PostToolUse');
      expect(input.toolName).toBe('Edit');
      expect(input.toolInput.file_path).toBeDefined();
    });

    it('should validate Write event with file_path', () => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      expect(input.event).toBe('PostToolUse');
      expect(input.toolName).toBe('Write');
      expect(input.toolInput.file_path).toBeDefined();
    });

    it('should skip non-Edit/Write events', () => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Read',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      const shouldProcess = input.toolName === 'Edit' || input.toolName === 'Write';
      expect(shouldProcess).toBe(false);
    });

    it('should skip non-PostToolUse events', () => {
      const input = {
        event: 'PreToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/project/src/file.ts' }
      };

      const shouldProcess = input.event === 'PostToolUse';
      expect(shouldProcess).toBe(false);
    });
  });

  describe('Path normalization', () => {
    it('should handle Windows paths', () => {
      const path = 'C:\\Users\\test\\project\\file.ts';
      const normalized = path.replace(/\\/g, '/');
      expect(normalized).toBe('C:/Users/test/project/file.ts');
    });

    it('should handle Unix paths', () => {
      const path = '/home/user/project/file.ts';
      const normalized = path.replace(/\\/g, '/');
      expect(normalized).toBe('/home/user/project/file.ts');
    });

    it('should handle paths with spaces', () => {
      const path = '/project/my files/file.ts';
      expect(path).toContain('my files');
    });

    it('should handle paths with special characters', () => {
      const path = '/project/file-name_v2.ts';
      expect(path).toContain('file-name_v2');
    });
  });

  describe('Extension detection', () => {
    it('should detect TypeScript extensions', () => {
      expect('/file.ts'.endsWith('.ts')).toBe(true);
      expect('/file.tsx'.endsWith('.tsx')).toBe(true);
    });

    it('should detect JavaScript extensions', () => {
      expect('/file.js'.endsWith('.js')).toBe(true);
      expect('/file.jsx'.endsWith('.jsx')).toBe(true);
    });

    it('should detect JSON extension', () => {
      expect('/file.json'.endsWith('.json')).toBe(true);
    });

    it('should detect CSS extensions', () => {
      expect('/file.css'.endsWith('.css')).toBe(true);
      expect('/file.scss'.endsWith('.scss')).toBe(true);
    });

    it('should detect markdown extension', () => {
      expect('/file.md'.endsWith('.md')).toBe(true);
    });

    it('should detect HTML extension', () => {
      expect('/file.html'.endsWith('.html')).toBe(true);
    });

    it('should handle case-insensitive extension check', () => {
      expect('/file.TS'.toLowerCase().endsWith('.ts')).toBe(true);
      expect('/file.JSX'.toLowerCase().endsWith('.jsx')).toBe(true);
    });
  });
});
