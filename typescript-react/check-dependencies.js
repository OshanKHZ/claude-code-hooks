const stdin = process.stdin;
const chunks = [];

// Lista de dependências confiáveis (whitelist)
const TRUSTED_PACKAGES = [
  'react', 'next', 'typescript', 'tailwindcss', 'lodash', 'axios', 'express',
  '@radix-ui', '@tanstack', 'lucide-react', 'clsx', 'zod', 'recharts', 'date-fns',
  '@supabase', 'framer-motion', 'react-hook-form', 'jotai'
];

// Typosquatting comum
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

  // Só processa comandos Bash
  if (event !== 'PostToolUse' || toolName !== 'Bash') {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  const command = toolInput?.command || '';

  // Bypass com "force" ou "--force"
  if (/--force|--yes|-y\b/.test(command)) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  // Check if command is a package installation
  const installRegex = /(npm\s+(?:install|i|add)|pnpm\s+(?:add|install|i)|yarn\s+add)\s+(.+)/i;
  const match = command.match(installRegex);

  if (!match) {
    // Não é instalação de pacote, permite
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  // Extrai os pacotes do comando
  const packagesString = match[2];
  const packages = packagesString
    .split(/\s+/)
    .filter(pkg => pkg && !pkg.startsWith('-')) // Remove flags
    .map(pkg => pkg.replace(/^['"]|['"]$/g, '')); // Remove aspas

  const warnings = [];
  let allTrusted = true;

  for (const pkgName of packages) {
    // Ignora versões (@1.0.0, ^1.0.0, etc)
    const cleanPkg = pkgName.split('@').filter(p => p && !/^\d/.test(p)).join('@');

    // Check typosquatting
    const pkgBaseName = cleanPkg.replace(/^@[^/]+\//, '').replace(/^@/, '');
    if (TYPO_RISKS[pkgBaseName]) {
      warnings.push(`🚨 TYPO DETECTADO: "${cleanPkg}" → você quis dizer "${TYPO_RISKS[pkgBaseName]}"?`);
      allTrusted = false;
      continue;
    }

    // Check if trusted
    const isTrusted = TRUSTED_PACKAGES.some(trusted => {
      // Para scoped packages (@radix-ui/...), verifica se começa com o scope
      if (cleanPkg.startsWith('@')) {
        return trusted.startsWith('@') && cleanPkg.startsWith(trusted);
      }
      return cleanPkg === trusted || cleanPkg.startsWith(trusted + '/');
    });

    if (!isTrusted) {
      warnings.push(`⚠️ Pacote "${cleanPkg}" não está na lista de confiáveis`);
      allTrusted = false;
    }
  }

  // Se todos os pacotes são trusted, permite
  if (allTrusted && packages.length > 0) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  if (warnings.length > 0) {
    console.log(JSON.stringify({
      status: 'blocked',
      message: `❌ Instalação de pacotes bloqueada:\n\n${warnings.join('\n')}\n\n🔒 Por segurança, revise manualmente antes de instalar.\nAdicione --force ao comando para ignorar.`
    }));
    process.exit(1);
    return;
  }

  console.log(JSON.stringify({ status: 'ok' }));
  process.exit(0);
});
