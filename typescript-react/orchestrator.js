const { execSync } = require('child_process');
const path = require('path');
const { loadConfig } = require('./shared-utils');

// Lê stdin
const stdin = process.stdin;
const chunks = [];

/**
 * Execute a single hook
 */
function executeHook(hookPath, input) {
  try {
    const result = execSync(`node "${hookPath}"`, {
      input: input,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const output = JSON.parse(result.trim());
    return { success: output.status !== 'blocked', output };
  } catch (error) {
    if (error.stdout) {
      try {
        const output = JSON.parse(error.stdout.trim());
        return { success: false, output };
      } catch (e) {
        return {
          success: false,
          output: {
            status: 'blocked',
            message: `❌ Hook error:\n${error.stdout || error.stderr}`
          }
        };
      }
    }
    return { success: true, output: { status: 'ok' } };
  }
}

/**
 * Execute hooks in parallel
 */
async function executeParallel(hooks, input, hooksDir) {
  const promises = hooks.map(hookFile => {
    const hookPath = path.join(hooksDir, hookFile);
    return Promise.resolve(executeHook(hookPath, input));
  });

  const results = await Promise.all(promises);

  // Check if any hook blocked
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (!result.success) {
      return result.output;
    }
    // Show success messages
    if (result.output.message) {
      console.error(result.output.message);
    }
  }

  return { status: 'ok' };
}

/**
 * Execute hooks sequentially
 */
async function executeSequential(hooks, input, hooksDir) {
  for (const hookFile of hooks) {
    const hookPath = path.join(hooksDir, hookFile);
    const result = executeHook(hookPath, input);

    if (!result.success) {
      return result.output;
    }

    if (result.output.message) {
      console.error(result.output.message);
    }
  }

  return { status: 'ok' };
}

stdin.on('data', (chunk) => chunks.push(chunk));
stdin.on('end', async () => {
  const input = Buffer.concat(chunks).toString();
  const hooksDir = path.resolve(__dirname);
  const config = loadConfig();

  // Hook execution groups
  // Group 1: Can run in parallel (independent checks)
  const parallelHooks = [
    'check-dependencies.js',      // Validates package installs (Bash)
    'validate-imports.js',        // Validates imports (Edit/Write)
    'typecheck-after-edit.js',    // TypeScript type checking (Edit/Write)
    'lint-after-edit.js',         // ESLint --fix (Edit/Write)
  ];

  // Group 2: Must run after parallel group (needs code to be linted)
  const sequentialHooks = [
    'format-on-edit.js'           // Prettier format (Edit/Write)
  ];

  try {
    let result;

    // Execute parallel group
    if (config.orchestrator.parallel) {
      result = await executeParallel(parallelHooks, input, hooksDir);
    } else {
      result = await executeSequential(parallelHooks, input, hooksDir);
    }

    // If parallel group blocked, stop
    if (result.status === 'blocked') {
      console.log(JSON.stringify(result));
      process.exit(1);
      return;
    }

    // Execute sequential group (format)
    result = await executeSequential(sequentialHooks, input, hooksDir);

    if (result.status === 'blocked') {
      console.log(JSON.stringify(result));
      process.exit(1);
      return;
    }

    // All hooks passed
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
  } catch (error) {
    console.log(JSON.stringify({
      status: 'blocked',
      message: `❌ Orchestrator error: ${error.message}`
    }));
    process.exit(1);
  }
});
