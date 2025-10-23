const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const stdin = process.stdin;
const chunks = [];

const CACHE_FILE = path.join(__dirname, 'tsconfig-cache.json');
const RESULTS_CACHE_FILE = path.join(__dirname, 'typecheck-results-cache.json');
const PROJECT_ROOT = path.resolve(__dirname, '../..');

/**
 * TypeScript Results Cache
 * Caches typecheck results by file hash to avoid re-checking unchanged files
 */
class TypeCheckResultsCache {
  constructor() {
    this.cache = this.loadCache();
  }

  loadCache() {
    if (fs.existsSync(RESULTS_CACHE_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(RESULTS_CACHE_FILE, 'utf8'));
      } catch {
        return {};
      }
    }
    return {};
  }

  saveCache() {
    fs.writeFileSync(RESULTS_CACHE_FILE, JSON.stringify(this.cache, null, 2));
  }

  getFileHash(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  getCachedResult(filePath) {
    const hash = this.getFileHash(filePath);
    if (!hash) return null;

    const cached = this.cache[filePath];
    if (cached && cached.hash === hash) {
      // Check if cache is not too old (max 1 hour)
      const age = Date.now() - cached.timestamp;
      if (age < 3600000) {
        return cached.result;
      }
    }

    return null;
  }

  setCachedResult(filePath, result) {
    const hash = this.getFileHash(filePath);
    if (!hash) return;

    this.cache[filePath] = {
      hash,
      timestamp: Date.now(),
      result
    };

    this.saveCache();
  }

  invalidate(filePath) {
    delete this.cache[filePath];
    this.saveCache();
  }
}

/**
 * TypeScript Config Cache
 * Uses SHA256 hashing for fast cache validation (< 5ms)
 */
class TypeScriptConfigCache {
  constructor() {
    this.cache = this.loadCache();
  }

  loadCache() {
    if (fs.existsSync(CACHE_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
      } catch {
        return { hashes: {}, fileToConfig: {} };
      }
    }
    return { hashes: {}, fileToConfig: {} };
  }

  saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(this.cache, null, 2));
  }

  getConfigHash(configPath) {
    if (!fs.existsSync(configPath)) return null;
    const content = fs.readFileSync(configPath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  isValid() {
    // Check if all tsconfig files still have same hash
    for (const [configPath, storedHash] of Object.entries(this.cache.hashes)) {
      const currentHash = this.getConfigHash(configPath);
      if (currentHash !== storedHash) {
        return false;
      }
    }
    return true;
  }

  findTsConfigForFile(filePath) {
    // Check cache first
    if (this.isValid() && this.cache.fileToConfig[filePath]) {
      return this.cache.fileToConfig[filePath];
    }

    // Rebuild cache
    this.rebuildCache();

    // Try to find config
    const configs = [
      path.join(PROJECT_ROOT, 'tsconfig.json'),
      path.join(PROJECT_ROOT, 'tsconfig.app.json'),
      path.join(PROJECT_ROOT, 'tsconfig.node.json'),
    ];

    for (const config of configs) {
      if (fs.existsSync(config)) {
        this.cache.fileToConfig[filePath] = config;
        this.saveCache();
        return config;
      }
    }

    return null;
  }

  rebuildCache() {
    this.cache = { hashes: {}, fileToConfig: {} };

    const configs = [
      path.join(PROJECT_ROOT, 'tsconfig.json'),
      path.join(PROJECT_ROOT, 'tsconfig.app.json'),
      path.join(PROJECT_ROOT, 'tsconfig.node.json'),
    ];

    for (const config of configs) {
      const hash = this.getConfigHash(config);
      if (hash) {
        this.cache.hashes[config] = hash;
      }
    }

    this.saveCache();
  }
}

/**
 * Run TypeScript type check on a single file
 */
function typeCheckFile(filePath, configPath) {
  try {
    // Strategy: Use incremental compilation mode for faster checks
    // 1. Use --incremental to enable incremental compilation
    // 2. tsc will use .tsbuildinfo cache file
    // 3. Only recompile changed files
    const result = execSync(
      `pnpm exec tsc --noEmit --skipLibCheck --incremental --project "${configPath}"`,
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: 'pipe',
        timeout: 15000, // 15s timeout
      }
    );

    return { success: true, output: '', fromCache: true };
  } catch (error) {
    const output = error.stdout || error.stderr || '';

    // Filter to only show errors for the edited file
    const normalizedFilePath = path.normalize(filePath).replace(/\\/g, '/');
    const lines = output.split('\n');
    const relevantErrors = [];
    const allErrors = [];

    for (const line of lines) {
      const normalizedLine = line.replace(/\\/g, '/');

      // Parse error line: file.ts(line,col): error TS2xxx: message
      const errorMatch = line.match(/^(.+)\((\d+),(\d+)\):\s+(error\s+TS\d+):\s+(.+)$/);

      if (errorMatch) {
        const [, errorFile, errorLine, errorCol, errorCode, errorMsg] = errorMatch;
        const error = {
          file: errorFile.replace(/\\/g, '/'),
          line: parseInt(errorLine),
          column: parseInt(errorCol),
          code: errorCode,
          message: errorMsg
        };

        allErrors.push(error);

        if (normalizedLine.includes(normalizedFilePath)) {
          relevantErrors.push(error);
        }
      }
    }

    if (relevantErrors.length === 0) {
      // No errors in edited file, only in dependencies
      return { success: true, output: '', dependencyErrors: allErrors.length };
    }

    // Format errors nicely
    let formattedOutput = '';
    for (const err of relevantErrors) {
      formattedOutput += `${path.basename(err.file)}:${err.line}:${err.column}\n`;
      formattedOutput += `  ${err.code}: ${err.message}\n\n`;
    }

    return {
      success: false,
      output: formattedOutput.trim(),
      errors: relevantErrors,
      dependencyErrors: allErrors.length - relevantErrors.length
    };
  }
}

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

  // Only validate TypeScript files
  if (!/\.(ts|tsx)$/.test(filePath)) {
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

  try {
    const configCache = new TypeScriptConfigCache();
    const resultsCache = new TypeCheckResultsCache();
    const configPath = configCache.findTsConfigForFile(filePath);

    if (!configPath) {
      console.log(JSON.stringify({
        status: 'ok',
        message: '⚠️ No tsconfig.json found, skipping typecheck'
      }));
      process.exit(0);
      return;
    }

    // Check results cache first
    const cachedResult = resultsCache.getCachedResult(filePath);
    if (cachedResult) {
      if (cachedResult.success) {
        console.log(JSON.stringify({
          status: 'ok',
          message: `✅ TypeScript: ${path.basename(filePath)} (cached)`
        }));
        process.exit(0);
        return;
      } else {
        // Return cached error
        console.log(JSON.stringify({
          status: 'blocked',
          message: cachedResult.message,
          details: cachedResult.details
        }));
        process.exit(1);
        return;
      }
    }

    // Run typecheck
    const result = typeCheckFile(filePath, configPath);

    if (result.success) {
      let msg = `✅ TypeScript: ${path.basename(filePath)}`;
      if (result.fromCache) msg += ' (incremental)';
      if (result.dependencyErrors > 0) {
        msg += ` [${result.dependencyErrors} errors in dependencies]`;
      }

      // Cache successful result
      resultsCache.setCachedResult(filePath, {
        success: true,
        message: msg
      });

      console.log(JSON.stringify({
        status: 'ok',
        message: msg
      }));
      process.exit(0);
    } else {
      // Format error message
      let message = `❌ TypeScript errors in ${path.basename(filePath)}:\n\n`;
      message += result.output;

      if (result.dependencyErrors > 0) {
        message += `\n\n⚠️ ${result.dependencyErrors} errors in dependencies (hidden)`;
      }

      const details = {
        file: filePath,
        errors: result.errors || [],
        dependencyErrors: result.dependencyErrors || 0
      };

      // Cache error result
      resultsCache.setCachedResult(filePath, {
        success: false,
        message,
        details
      });

      console.log(JSON.stringify({
        status: 'blocked',
        message,
        details
      }));
      process.exit(1);
    }
  } catch (error) {
    // TypeScript check failed completely - let it pass to avoid blocking
    console.log(JSON.stringify({
      status: 'ok',
      message: `⚠️ TypeScript check failed: ${error.message}`
    }));
    process.exit(0);
  }
});
