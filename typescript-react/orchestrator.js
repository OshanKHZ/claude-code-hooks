const { execSync } = require('child_process');
const path = require('path');

// Lê stdin
const stdin = process.stdin;
const chunks = [];

stdin.on('data', (chunk) => chunks.push(chunk));
stdin.on('end', async () => {
  const input = Buffer.concat(chunks).toString();
  const hooksDir = path.resolve(__dirname);

  // Lista de hooks a executar em ordem
  const hooks = [
    'check-dependencies.js',   // Valida instalações de pacotes (Bash commands)
    'validate-imports.js',     // Valida imports (Edit/Write)
    'lint-after-edit.js',      // Lint com ESLint (Edit/Write)
    'format-on-edit.js'        // Formata com Prettier (Edit/Write)
  ];

  for (const hookFile of hooks) {
    const hookPath = path.join(hooksDir, hookFile);

    try {
      // Executa o hook passando o input
      const result = execSync(`node "${hookPath}"`, {
        input: input,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Parse do resultado
      const output = JSON.parse(result.trim());

      // Se bloqueou, para aqui
      if (output.status === 'blocked') {
        console.log(JSON.stringify(output));
        process.exit(1);
        return;
      }

      // Se retornou mensagem de sucesso, mostra
      if (output.message) {
        console.error(output.message);
      }

    } catch (error) {
      // Hook retornou erro (exit code 1)
      if (error.stdout) {
        try {
          const output = JSON.parse(error.stdout.trim());
          console.log(JSON.stringify(output));
          process.exit(1);
          return;
        } catch (e) {
          // Não conseguiu fazer parse, mostra erro bruto
          console.log(JSON.stringify({
            status: 'blocked',
            message: `❌ Erro no hook ${hookFile}:\n${error.stdout || error.stderr}`
          }));
          process.exit(1);
          return;
        }
      }
    }
  }

  // Todos os hooks passaram
  console.log(JSON.stringify({ status: 'ok' }));
  process.exit(0);
});
