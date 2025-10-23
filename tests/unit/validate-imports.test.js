import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('validate-imports', () => {
  let consoleLogSpy;
  let processExitSpy;
  let processStdinSpy;
  let fsExistsSyncSpy;
  let fsReaddirSyncSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    fsExistsSyncSpy = vi.spyOn(fs, 'existsSync');
    fsReaddirSyncSpy = vi.spyOn(fs, 'readdirSync');
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    fsExistsSyncSpy.mockRestore();
    fsReaddirSyncSpy.mockRestore();
    if (processStdinSpy) {
      processStdinSpy.mockRestore();
    }
    delete require.cache[require.resolve('../../typescript-react/validate-imports.js')];
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
    require('../../typescript-react/validate-imports.js');
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
        toolInput: {
          file_path: '/path/to/config.json',
          new_string: '{"key": "value"}'
        }
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
        toolInput: {
          file_path: '/path/to/styles.css',
          content: '.class { color: red; }'
        }
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

  describe('Valid imports', () => {
    it('should allow imports from node_modules', (done) => {
      const content = `
        import React from 'react';
        import { useState } from 'react';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/component.tsx',
          content
        }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should allow valid relative imports when files exist', (done) => {
      const content = `
        import utils from './utils';
        import config from '../config';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: {
          file_path: '/project/src/components/Button.tsx',
          new_string: content
        }
      };

      // Mock file existence
      fsExistsSyncSpy.mockImplementation((filePath) => {
        return filePath.includes('utils') || filePath.includes('config');
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should allow valid alias imports when files exist', (done) => {
      const content = `
        import { Button } from '@/components/ui/button';
        import utils from '@/lib/utils';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/app/page.tsx',
          content
        }
      };

      // Mock file existence for alias paths
      fsExistsSyncSpy.mockReturnValue(true);

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle index file imports', (done) => {
      const content = `
        import { helpers } from './helpers';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: {
          file_path: '/project/src/utils.ts',
          new_string: content
        }
      };

      // Mock directory with index file
      fsExistsSyncSpy.mockImplementation((filePath) => {
        return filePath.includes('index');
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });

  describe('Invalid imports', () => {
    it('should block imports to non-existent files', (done) => {
      const content = `
        import utils from './nonexistent';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/component.tsx',
          content
        }
      };

      fsExistsSyncSpy.mockReturnValue(false);

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('Invalid imports detected');
        expect(output.message).toContain('nonexistent');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should block imports to non-existent alias paths', (done) => {
      const content = `
        import { Button } from '@/components/nonexistent';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: {
          file_path: '/project/src/app/page.tsx',
          new_string: content
        }
      };

      fsExistsSyncSpy.mockReturnValue(false);

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('Invalid imports detected');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should provide suggestions for similar file names', (done) => {
      const content = `
        import utils from './Utils';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/component.tsx',
          content
        }
      };

      fsExistsSyncSpy.mockImplementation((filePath) => {
        if (filePath.includes('Utils')) return false;
        return true;
      });

      fsReaddirSyncSpy.mockReturnValue(['utils.ts', 'helpers.ts']);

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('Did you mean');
        expect(output.message).toContain('utils');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should include error details in response', (done) => {
      const content = `
        import a from './a';
        import b from './b';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/component.tsx',
          content
        }
      };

      fsExistsSyncSpy.mockReturnValue(false);

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.details).toBeDefined();
        expect(output.details.errors).toBeDefined();
        expect(output.details.count).toBe(2);
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });
  });

  describe('Import extraction', () => {
    it('should extract named imports', (done) => {
      const content = `
        import { useState, useEffect } from 'react';
        import { Button } from '@/components/ui/button';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/component.tsx',
          content
        }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should extract default imports', (done) => {
      const content = `
        import React from 'react';
        import utils from './utils';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/component.tsx',
          content
        }
      };

      fsExistsSyncSpy.mockReturnValue(true);

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle mixed import styles', (done) => {
      const content = `
        import React, { useState } from 'react';
        import type { Props } from './types';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/component.tsx',
          content
        }
      };

      fsExistsSyncSpy.mockReturnValue(true);

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should ignore node_modules imports', (done) => {
      const content = `
        import lodash from 'lodash';
        import axios from 'axios';
        import { format } from 'date-fns';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/component.tsx',
          content
        }
      };

      // These should not trigger file existence checks
      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });
  });

  describe('Alias resolution', () => {
    it('should resolve @/ alias', (done) => {
      const content = `
        import { Button } from '@/components/ui/button';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/app/page.tsx',
          content
        }
      };

      fsExistsSyncSpy.mockImplementation((filePath) => {
        return filePath.includes('src/components/ui/button');
      });

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should resolve @ alias', (done) => {
      const content = `
        import utils from '@lib/utils';
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/app/page.tsx',
          content
        }
      };

      fsExistsSyncSpy.mockReturnValue(true);

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
    it('should handle files with no imports', (done) => {
      const content = `
        const x = 1;
        console.log(x);
      `;

      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/utils.ts',
          content
        }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle empty content', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: {
          file_path: '/project/src/empty.ts',
          content: ''
        }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

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
  });
});
