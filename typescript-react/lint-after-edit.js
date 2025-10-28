const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getProjectRoot, detectPackageManager, isCommandAvailable } = require('./shared-utils');

const stdin = process.stdin;
const chunks = [];

stdin.on('data', (chunk) => chunks.push(chunk));
stdin.on('end', async () => {
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const { event, toolName, toolInput } = input;

  // Only process Edit and Write
  if (event !== 'PostToolUse' || !['Edit', 'Write'].includes(toolName)) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  const filePath = toolInput?.file_path || '';

  // Only validate TS/TSX/JS/JSX files
  if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  // Check if ESLint is available
  if (!isCommandAvailable('eslint')) {
    console.log(JSON.stringify({
      status: 'ok',
      message: `⚠️  ESLint not found. Install it with: npm install -D eslint`
    }));
    process.exit(0);
    return;
  }

  try {
    const projectRoot = getProjectRoot();
    const packageManager = detectPackageManager();

    // Build command based on package manager
    const eslintCmd = packageManager === 'npm'
      ? `npx eslint "${filePath}" --fix`
      : `${packageManager} exec eslint "${filePath}" --fix`;

    // Run ESLint with --fix on the file
    execSync(eslintCmd, {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 30000
    });

    console.log(JSON.stringify({
      status: 'ok',
      message: `✅ Lint passed: ${filePath}`
    }));
    process.exit(0);
  } catch (error) {
    const output = error.stdout || error.stderr || '';

    // If ESLint fixed but there are still non-fixable errors
    if (output.includes('error') || output.includes('✖')) {
      console.log(JSON.stringify({
        status: 'blocked',
        message: `❌ ESLint found errors in ${filePath}:\n\n${output.slice(0, 500)}\n\n💡 Fix the errors before continuing.`
      }));
      process.exit(1);
      return;
    }

    // Other errors (e.g., ESLint not installed)
    console.log(JSON.stringify({
      status: 'ok',
      message: `⚠️  ESLint unavailable or error running on: ${filePath}`
    }));
    process.exit(0);
  }
});
