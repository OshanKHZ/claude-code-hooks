const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const stdin = process.stdin;
const chunks = [];

stdin.on('data', (chunk) => chunks.push(chunk));
stdin.on('end', async () => {
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const { event, toolName, toolInput } = input;

  // Só processa Edit e Write
  if (event !== 'PostToolUse' || !['Edit', 'Write'].includes(toolName)) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  const filePath = toolInput?.file_path || '';

  // Apenas valida arquivos TS/TSX/JS/JSX
  if (!/\.(ts|tsx|js|jsx)$/.test(filePath)) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  // Verifica se o arquivo existe
  if (!fs.existsSync(filePath)) {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  try {
    // Roda ESLint com --fix no arquivo
    execSync(`pnpm exec eslint "${filePath}" --fix`, {
      cwd: path.resolve(__dirname, '../..'),
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 30000
    });

    console.log(JSON.stringify({
      status: 'ok',
      message: `✅ Lint passou: ${filePath}`
    }));
    process.exit(0);
  } catch (error) {
    const output = error.stdout || error.stderr || '';

    // Se ESLint fixou mas ainda há erros não-fixáveis
    if (output.includes('error') || output.includes('✖')) {
      console.log(JSON.stringify({
        status: 'blocked',
        message: `❌ ESLint encontrou erros em ${filePath}:\n\n${output.slice(0, 500)}\n\n💡 Corrija os erros antes de continuar.`
      }));
      process.exit(1);
      return;
    }

    // Outros erros (ex: ESLint não instalado)
    console.log(JSON.stringify({
      status: 'ok',
      message: `⚠️ ESLint não disponível ou erro ao rodar: ${filePath}`
    }));
    process.exit(0);
  }
});
