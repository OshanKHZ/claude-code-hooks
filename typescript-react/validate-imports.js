const fs = require('fs');
const path = require('path');
const stdin = process.stdin;
const chunks = [];

// Mapeamento de aliases do tsconfig
const ALIASES = {
  '@/': 'src/',
  '@': 'src/'
};

function resolveAlias(importPath) {
  for (const [alias, realPath] of Object.entries(ALIASES)) {
    if (importPath.startsWith(alias)) {
      return importPath.replace(alias, realPath);
    }
  }
  return importPath;
}

function extractImports(content) {
  const imports = [];

  // Match: import { X } from "path" ou import X from "path"
  const importRegex = /import\s+(?:{[^}]+}|\w+)\s+from\s+['"]([^'"]+)['"]/g;

  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];

    // Ignora imports de node_modules (que não começam com . ou @/)
    if (!importPath.startsWith('.') && !importPath.startsWith('@/') && !importPath.startsWith('@')) {
      continue;
    }

    imports.push(importPath);
  }

  return imports;
}

function checkFileExists(filePath, projectRoot) {
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];

  for (const ext of extensions) {
    const fullPath = path.join(projectRoot, filePath + ext);
    if (fs.existsSync(fullPath)) {
      return true;
    }

    // Verifica se é um diretório com index
    const indexPath = path.join(projectRoot, filePath, 'index' + ext);
    if (fs.existsSync(indexPath)) {
      return true;
    }
  }

  return false;
}

stdin.on('data', (chunk) => chunks.push(chunk));
stdin.on('end', async () => {
  const input = JSON.parse(Buffer.concat(chunks).toString());
  const { event, toolName, toolInput } = input;
  const projectRoot = path.resolve(__dirname, '../..');

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

  let content = '';
  if (toolName === 'Edit') {
    content = toolInput?.new_string || '';
  } else if (toolName === 'Write') {
    content = toolInput?.content || '';
  }

  const imports = extractImports(content);
  const invalidImports = [];

  for (const importPath of imports) {
    let resolvedPath = importPath;

    // Resolve imports relativos
    if (importPath.startsWith('.')) {
      const dir = path.dirname(filePath);
      resolvedPath = path.join(dir, importPath);
    } else {
      // Resolve aliases
      resolvedPath = resolveAlias(importPath);
    }

    // Verifica se o arquivo existe
    if (!checkFileExists(resolvedPath, projectRoot)) {
      invalidImports.push({
        file: filePath,
        import: importPath,
        resolved: resolvedPath
      });
    }
  }

  if (invalidImports.length > 0) {
    let message = '🚨 Imports inválidos detectados:\n\n';

    for (const { file, import: imp, resolved } of invalidImports) {
      message += `❌ ${file}\n`;
      message += `   import: "${imp}"\n`;
      message += `   caminho: ${resolved}\n\n`;
    }

    message += '💡 Verifique se:\n';
    message += '   - O arquivo existe no caminho correto\n';
    message += '   - O alias está configurado corretamente\n';
    message += '   - O nome do arquivo está correto (maiúsculas/minúsculas)';

    console.log(JSON.stringify({
      status: 'blocked',
      message: message
    }));
    process.exit(1);
    return;
  }

  console.log(JSON.stringify({ status: 'ok' }));
  process.exit(0);
});
