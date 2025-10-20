const https = require('https');
const stdin = process.stdin;
const chunks = [];

// Lista de dependências confiáveis (whitelist)
const TRUSTED_PACKAGES = [
  'react', 'next', 'typescript', 'tailwindcss', 'lodash', 'axios', 'express',
  '@radix-ui', '@tanstack', 'lucide-react', 'clsx', 'zod', 'recharts'
];

// Typosquatting comum
const TYPO_RISKS = {
  'recat': 'react',
  'expres': 'express',
  'axois': 'axios',
  'lodas': 'lodash',
  'typescirpt': 'typescript'
};

stdin.on('data', (chunk) => chunks.push(chunk));
stdin.on('end', async () => {
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const userMessage = input.prompt;

  // Bypass com "force"
  if (/\bforce\b/i.test(userMessage)) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  // Check if message mentions dependency operations
  const depKeywords = [
    /\bdependenc(y|ies|ia|ias)\b/i,
    /package\.json/i,
    /npm\s+(install|add|remove|uninstall)/i,
    /pnpm\s+(add|remove|install)/i,
    /yarn\s+(add|remove)/i,
    /remover\s+pacote/i,
    /adicionar\s+pacote/i,
    /atualizar\s+pacote/i
  ];

  const hasDependencyMention = depKeywords.some(regex => regex.test(userMessage));

  if (hasDependencyMention) {
    // Extrair nomes de pacotes da mensagem
    const packageNameRegex = /(?:install|add|adicionar)\s+(@?[a-z0-9@\-\/]+)/gi;
    const matches = [...userMessage.matchAll(packageNameRegex)];

    if (matches.length > 0) {
      const warnings = [];
      let allTrusted = true;

      for (const match of matches) {
        const pkgName = match[1];

        // Check typosquatting
        const pkgBaseName = pkgName.replace(/^@[^/]+\//, '').replace(/^@/, '');
        if (TYPO_RISKS[pkgBaseName]) {
          warnings.push(`🚨 TYPO DETECTADO: "${pkgName}" → você quis dizer "${TYPO_RISKS[pkgBaseName]}"?`);
          allTrusted = false;
          continue;
        }

        // Check if trusted
        const isTrusted = TRUSTED_PACKAGES.some(trusted => {
          // Para scoped packages (@radix-ui/...), verifica se começa com o scope
          if (pkgName.startsWith('@')) {
            return trusted.startsWith('@') && pkgName.startsWith(trusted);
          }
          return pkgName.startsWith(trusted);
        });

        if (!isTrusted) {
          warnings.push(`⚠️ Pacote "${pkgName}" não está na lista de confiáveis`);
          allTrusted = false;
        }
      }

      // Se todos os pacotes são trusted, permite
      if (allTrusted && matches.length > 0) {
        console.log(JSON.stringify({ status: 'ok' }));
        process.exit(0);
        return;
      }

      if (warnings.length > 0) {
        console.log(JSON.stringify({
          status: 'blocked',
          message: warnings.join('\n') + '\n\n🔒 Por segurança, revise manualmente antes de instalar.\nAdicione "force" na mensagem para ignorar.'
        }));
        process.exit(1);
        return;
      }
    }

    // Generic dependency warning
    console.log(JSON.stringify({
      status: 'blocked',
      message: '⚠️ Operações em dependências devem ser revisadas manualmente.\n\n🔒 Verifique segurança antes de prosseguir.\nAdicione "force" na mensagem para ignorar.'
    }));
    process.exit(1);
  }

  console.log(JSON.stringify({ status: 'ok' }));
  process.exit(0);
});
