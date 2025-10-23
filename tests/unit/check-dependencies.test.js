import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Readable } from 'stream';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

describe('check-dependencies', () => {
  let consoleLogSpy;
  let processExitSpy;
  let processStdinSpy;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    processExitSpy.mockRestore();
    if (processStdinSpy) {
      processStdinSpy.mockRestore();
    }
    // Clear module cache
    delete require.cache[require.resolve('../../typescript-react/check-dependencies.js')];
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
    require('../../typescript-react/check-dependencies.js');
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

  describe('Non-Bash commands', () => {
    it('should allow Edit commands', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Edit',
        toolInput: { file_path: '/path/to/file.ts' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should allow Write commands', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Write',
        toolInput: { file_path: '/path/to/file.ts' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should allow Read commands', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Read',
        toolInput: { file_path: '/path/to/file.ts' }
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

  describe('Non-install Bash commands', () => {
    it('should allow git commands', (done) => {
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

    it('should allow build commands', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm run build' }
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

  describe('Trusted packages', () => {
    it('should allow installing react', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install react' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should allow installing multiple trusted packages', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install react next typescript' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should allow installing scoped packages', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'pnpm add @radix-ui/react-dialog' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should allow installing packages with yarn', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'yarn add lodash' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should allow installing packages with pnpm', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'pnpm install axios' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should allow installing packages with versions', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install react@18.2.0' }
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

  describe('Untrusted packages', () => {
    it('should block unknown packages', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install unknown-suspicious-package' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('unknown-suspicious-package');
        expect(output.message).toContain('não está na lista de confiáveis');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should block multiple untrusted packages', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install unknown1 unknown2' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('unknown1');
        expect(output.message).toContain('unknown2');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should block mix of trusted and untrusted packages', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install react unknown-package' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('unknown-package');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });
  });

  describe('Typosquatting detection', () => {
    it('should detect "recat" typo', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install recat' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('TYPO DETECTADO');
        expect(output.message).toContain('recat');
        expect(output.message).toContain('react');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should detect "expres" typo', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install expres' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('TYPO DETECTADO');
        expect(output.message).toContain('expres');
        expect(output.message).toContain('express');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });

    it('should detect "axois" typo', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'pnpm add axois' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output.status).toBe('blocked');
        expect(output.message).toContain('TYPO DETECTADO');
        expect(output.message).toContain('axois');
        expect(output.message).toContain('axios');
        expect(processExitSpy).toHaveBeenCalledWith(1);
        done();
      }, 50);
    });
  });

  describe('Bypass flags', () => {
    it('should bypass with --force flag', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install unknown-package --force' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should bypass with -y flag', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install unknown-package -y' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should bypass with --yes flag', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'pnpm add unknown-package --yes' }
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

  describe('Package manager variations', () => {
    it('should handle npm install', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install react' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle npm i shorthand', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm i react' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle pnpm add', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'pnpm add react' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle yarn add', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'yarn add react' }
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
    it('should handle empty command', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: '' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle command without toolInput', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash'
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle packages with flags', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install react --save-dev' }
      };

      loadHookWithInput(input);

      setTimeout(() => {
        const output = getLastJsonOutput();
        expect(output).toEqual({ status: 'ok' });
        expect(processExitSpy).toHaveBeenCalledWith(0);
        done();
      }, 50);
    });

    it('should handle packages in quotes', (done) => {
      const input = {
        event: 'PostToolUse',
        toolName: 'Bash',
        toolInput: { command: 'npm install "react"' }
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
