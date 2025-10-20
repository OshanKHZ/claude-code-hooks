const { execSync } = require('child_process');
const path = require('path');
const stdin = process.stdin;
const chunks = [];

stdin.on('data', (chunk) => chunks.push(chunk));
stdin.on('end', async () => {
  const input = JSON.parse(Buffer.concat(chunks).toString());

  // Extrai arquivos editados dos tool_uses
  const editedFiles = [];
  let hasBashFileOperation = false;

  if (input.tool_uses) {
    for (const tool of input.tool_uses) {
      // Detecta Edit/Write diretos
      if (tool.tool_name === 'Edit' || tool.tool_name === 'Write') {
        const filePath = tool.tool_input?.file_path;
        if (filePath) {
          editedFiles.push(filePath);
        }
      }

      // Detecta comandos Bash que podem modificar arquivos
      if (tool.tool_name === 'Bash') {
        const command = tool.tool_input?.command || '';

        // Comandos perigosos que modificam arquivos
        const dangerousCommands = ['mv', 'cp', 'rm', 'mkdir', 'touch', 'sed', 'awk'];
        const hasDangerousCommand = dangerousCommands.some(cmd =>
          new RegExp(`\\b${cmd}\\b`).test(command)
        );

        if (hasDangerousCommand) {
          hasBashFileOperation = true;
        }
      }
    }
  }

  // Se usou Bash com comandos de arquivo, roda lint no projeto todo
  if (hasBashFileOperation && editedFiles.length === 0) {
    console.error('⚠️ Comando Bash detectado que pode modificar arquivos.');
    console.error('🔍 Rodando lint no projeto...');

    // Bypass com "skip-lint"
    if (/\bskip-lint\b/i.test(input.prompt)) {
      console.log(JSON.stringify({
        status: 'ok',
        message: '⏭️ Lint ignorado (skip-lint detectado)'
      }));
      process.exit(0);
      return;
    }

    try {
      execSync('pnpm lint', {
        cwd: path.resolve(__dirname, '..'),
        stdio: 'pipe',
        encoding: 'utf-8',
        timeout: 60000 // 60s timeout para projeto completo
      });

      console.log(JSON.stringify({
        status: 'ok',
        message: '✅ Lint passou sem erros (projeto completo)'
      }));
      process.exit(0);
    } catch (error) {
      const output = error.stdout || error.stderr || '';
      const errorCount = (output.match(/error/gi) || []).length;
      const warningCount = (output.match(/warning/gi) || []).length;

      let message = '⚠️ Lint detectou problemas após operação Bash:\n\n';
      if (errorCount > 0) message += `🔴 ${errorCount} erro(s)\n`;
      if (warningCount > 0) message += `🟡 ${warningCount} warning(s)\n`;
      message += '\n💡 Execute "pnpm lint:fix" ou adicione "skip-lint" para ignorar.';

      console.log(JSON.stringify({
        status: 'blocked',
        message: message
      }));
      process.exit(1);
    }
  }

  if (editedFiles.length === 0) {
    // Não foi edição, permite sem lint
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
    return;
  }

  // Bypass com "skip-lint"
  if (/\bskip-lint\b/i.test(input.prompt)) {
    console.log(JSON.stringify({
      status: 'ok',
      message: '⏭️ Lint ignorado (skip-lint detectado)'
    }));
    process.exit(0);
    return;
  }

  // Filtra apenas arquivos .ts, .tsx, .js, .jsx
  const lintableFiles = editedFiles.filter(file =>
    /\.(ts|tsx|js|jsx)$/.test(file)
  );

  if (lintableFiles.length === 0) {
    // Nenhum arquivo lintável editado
    console.log(JSON.stringify({
      status: 'ok',
      message: '⏭️ Nenhum arquivo lintável editado'
    }));
    process.exit(0);
    return;
  }

  try {
    // Roda o lint apenas nos arquivos editados
    const filesArg = lintableFiles.map(f => `"${f}"`).join(' ');
    console.error(`🔍 Rodando lint em ${lintableFiles.length} arquivo(s)...`);

    execSync(`pnpm lint ${filesArg}`, {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
      encoding: 'utf-8',
      timeout: 30000 // 30s timeout
    });

    // Lint passou sem erros
    console.log(JSON.stringify({
      status: 'ok',
      message: `✅ Lint passou sem erros (${lintableFiles.length} arquivo(s))`
    }));
    process.exit(0);

  } catch (error) {
    // Lint encontrou erros
    const output = error.stdout || error.stderr || '';
    const errorLines = output.split('\n').filter(line =>
      line.includes('error') || line.includes('warning')
    ).slice(0, 10); // Limita a 10 linhas

    const errorSummary = errorLines.join('\n');

    // Conta erros e warnings
    const errorCount = (output.match(/error/gi) || []).length;
    const warningCount = (output.match(/warning/gi) || []).length;

    let message = `⚠️ Lint detectou problemas em ${lintableFiles.length} arquivo(s):\n\n`;

    if (errorCount > 0) {
      message += `🔴 ${errorCount} erro(s)\n`;
    }
    if (warningCount > 0) {
      message += `🟡 ${warningCount} warning(s)\n`;
    }

    message += '\nPrimeiros erros:\n```\n' + errorSummary + '\n```\n\n';
    message += '💡 Execute "pnpm lint:fix" para corrigir automaticamente\n';
    message += '   ou adicione "skip-lint" na mensagem para ignorar.';

    console.log(JSON.stringify({
      status: 'blocked',
      message: message
    }));
    process.exit(1);
  }
});
