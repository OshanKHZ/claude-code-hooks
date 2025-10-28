const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');
let cachedConfig = null;

/**
 * Load hook configuration
 */
function loadConfig() {
  if (cachedConfig) return cachedConfig;

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      cachedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      return cachedConfig;
    }
  } catch (error) {
    console.error('Failed to load config:', error.message);
  }

  // Default config if file doesn't exist
  return {
    typescript: { enabled: true, timeout: 15000 },
    eslint: { enabled: true, autofix: true, timeout: 30000 },
    prettier: { enabled: true, timeout: 10000 },
    imports: { enabled: true, timeout: 5000 },
    dependencies: { enabled: true, allowBypass: true },
    orchestrator: { parallel: true, stopOnFirstError: true }
  };
}

/**
 * Read stdin synchronously
 */
function readStdin() {
  const chunks = [];
  const stdin = process.stdin;

  return new Promise((resolve) => {
    stdin.on('data', (chunk) => chunks.push(chunk));
    stdin.on('end', () => {
      const input = Buffer.concat(chunks).toString();
      resolve(JSON.parse(input));
    });
  });
}

/**
 * Exit with ok status
 */
function exitOk(message = null) {
  const output = { status: 'ok' };
  if (message) output.message = message;
  console.log(JSON.stringify(output));
  process.exit(0);
}

/**
 * Exit with blocked status
 */
function exitBlocked(message, details = null) {
  const output = { status: 'blocked', message };
  if (details) output.details = details;
  console.log(JSON.stringify(output));
  process.exit(1);
}

/**
 * Check if file is TypeScript
 */
function isTypeScriptFile(filePath) {
  return /\.(ts|tsx)$/.test(filePath);
}

/**
 * Check if file is JavaScript/TypeScript
 */
function isCodeFile(filePath) {
  return /\.(ts|tsx|js|jsx)$/.test(filePath);
}

/**
 * Get project root by searching for package.json
 * Walks up the directory tree from the hooks directory
 */
function getProjectRoot() {
  let currentDir = __dirname;

  // Walk up the directory tree
  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }

    currentDir = path.dirname(currentDir);
  }

  // Fallback to old behavior if package.json not found
  console.warn('⚠️  Warning: Could not find package.json, using fallback path detection');
  return path.resolve(__dirname, '../..');
}

/**
 * Normalize path for cross-platform
 */
function normalizePath(filePath) {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Format error message with details
 */
function formatError(error) {
  const { file, line, column, message, code, suggestion } = error;

  let output = `❌ ${file}`;
  if (line) output += `:${line}`;
  if (column) output += `:${column}`;
  output += `\n   ${message}`;
  if (code) output += ` (${code})`;
  if (suggestion) output += `\n\n💡 ${suggestion}`;

  return output;
}

/**
 * Detect which package manager is used in the project
 * @returns {'pnpm' | 'yarn' | 'npm'} The detected package manager
 */
function detectPackageManager() {
  const projectRoot = getProjectRoot();

  // Check for lock files
  if (fs.existsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  if (fs.existsSync(path.join(projectRoot, 'yarn.lock'))) {
    return 'yarn';
  }
  if (fs.existsSync(path.join(projectRoot, 'package-lock.json'))) {
    return 'npm';
  }

  // Default to npm
  return 'npm';
}

/**
 * Check if a command is available in the system
 * @param {string} command - The command to check
 * @returns {boolean} True if command is available
 */
function isCommandAvailable(command) {
  const { execSync } = require('child_process');
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  loadConfig,
  readStdin,
  exitOk,
  exitBlocked,
  isTypeScriptFile,
  isCodeFile,
  getProjectRoot,
  normalizePath,
  formatError,
  detectPackageManager,
  isCommandAvailable
};
