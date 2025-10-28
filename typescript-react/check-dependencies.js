const fs = require('fs');
const path = require('path');

const stdin = process.stdin;
const chunks = [];

// Load configuration
const CONFIG_FILE = path.join(__dirname, 'config.json');
let config = null;
try {
  if (fs.existsSync(CONFIG_FILE)) {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  }
} catch (error) {
  console.error('Failed to load config:', error.message);
}

// Default trusted packages list
const DEFAULT_TRUSTED_PACKAGES = [
  'react', 'next', 'typescript', 'tailwindcss', 'lodash', 'axios', 'express',
  '@radix-ui', '@tanstack', 'lucide-react', 'clsx', 'zod', 'recharts', 'date-fns',
  '@supabase', 'framer-motion', 'react-hook-form', 'jotai'
];

// Get trusted packages from config or use defaults
const TRUSTED_PACKAGES = config?.dependencies?.trustedPackages || DEFAULT_TRUSTED_PACKAGES;

// Common typosquatting patterns
const TYPO_RISKS = {
  'recat': 'react',
  'expres': 'express',
  'axois': 'axios',
  'lodas': 'lodash',
  'typescirpt': 'typescript',
  'etherum': 'ethereum',
  'nextjs': 'next'
};

stdin.on('data', (chunk) => chunks.push(chunk));
stdin.on('end', async () => {
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const { event, toolName, toolInput } = input;

  // Only process Bash commands
  if (event !== 'PostToolUse' || toolName !== 'Bash') {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  const command = toolInput?.command || '';

  // Allow bypass with --force flag
  if (/--force|--yes|-y\b/.test(command)) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  // Check if command is a package installation
  const installRegex = /(npm\s+(?:install|i|add)|pnpm\s+(?:add|install|i)|yarn\s+add)\s+(.+)/i;
  const match = command.match(installRegex);

  if (!match) {
    // Not a package installation, allow
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  // Extract packages from command
  const packagesString = match[2];
  const packages = packagesString
    .split(/\s+/)
    .filter(pkg => pkg && !pkg.startsWith('-')) // Remove flags
    .map(pkg => pkg.replace(/^['"]|['"]$/g, '')); // Remove quotes

  const warnings = [];
  let allTrusted = true;

  for (const pkgName of packages) {
    // Ignore versions (@1.0.0, ^1.0.0, etc)
    const cleanPkg = pkgName.split('@').filter(p => p && !/^\d/.test(p)).join('@');

    // Check for typosquatting
    const pkgBaseName = cleanPkg.replace(/^@[^/]+\//, '').replace(/^@/, '');
    if (TYPO_RISKS[pkgBaseName]) {
      warnings.push(`🚨 TYPO DETECTED: "${cleanPkg}" → did you mean "${TYPO_RISKS[pkgBaseName]}"?`);
      allTrusted = false;
      continue;
    }

    // Check if trusted
    const isTrusted = TRUSTED_PACKAGES.some(trusted => {
      // For scoped packages (@radix-ui/...), check if it starts with the scope
      if (cleanPkg.startsWith('@')) {
        return trusted.startsWith('@') && cleanPkg.startsWith(trusted);
      }
      return cleanPkg === trusted || cleanPkg.startsWith(trusted + '/');
    });

    if (!isTrusted) {
      warnings.push(`⚠️  Package "${cleanPkg}" is not in the trusted packages list`);
      allTrusted = false;
    }
  }

  // If all packages are trusted, allow
  if (allTrusted && packages.length > 0) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  if (warnings.length > 0) {
    console.log(JSON.stringify({
      status: 'blocked',
      message: `❌ Package installation blocked:\n\n${warnings.join('\n')}\n\n🔒 For security reasons, please review manually before installing.\nAdd --force to the command to bypass this check.`
    }));
    process.exit(1);
    return;
  }

  console.log(JSON.stringify({ status: 'ok' }));
  process.exit(0);
});
