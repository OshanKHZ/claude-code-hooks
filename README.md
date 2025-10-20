# Claude Hooks

Hooks personalizados para automação e segurança no desenvolvimento com Claude Code.

## 📋 Hooks Disponíveis

### 1. **Dependency Check Hook** (`check-dependencies-hook.js`)
Previne instalação acidental de pacotes maliciosos ou com typos.

**Quando roda:** Antes de cada prompt do usuário (`user-prompt-submit`)

**O que faz:**
- ✅ Valida pacotes contra whitelist de confiáveis
- 🚨 Detecta typosquatting (ex: `recat` → `react`)
- 🔒 Bloqueia instalação de pacotes não confiáveis
- 💡 Permite bypass com palavra-chave `force`

**Exemplo:**
```bash
# Bloqueado (pacote não confiável)
❌ "instalar pacote-suspeito"

# Permitido (bypass)
✅ "instalar pacote-suspeito force"

# Permitido (pacote confiável)
✅ "instalar @radix-ui/react-dialog"
```

**Pacotes confiáveis:**
- `react`, `next`, `typescript`, `tailwindcss`
- `@radix-ui/*`, `@tanstack/*`
- `lucide-react`, `clsx`, `zod`, `recharts`
- `lodash`, `axios`, `express`

---

### 2. **Import Validation Hook** (`validate-imports-hook.js`)
Valida se todos os imports existem antes de salvar o arquivo.

**Quando roda:** Após operações de `Edit` ou `Write` (via `tool-use-orchestrator.js`)

**O que faz:**
- 🔍 Extrai todos os imports de arquivos TS/TSX/JS/JSX
- ✅ Verifica se os arquivos importados existem no projeto
- 🗺️ Resolve aliases (`@/` → `src/`)
- 📁 Suporta imports relativos (`./ `, `../`)
- 🚫 **Bloqueia se encontrar imports inválidos**
- 💡 Permite bypass com palavra-chave `skip-import-check`

**Exemplo:**
```bash
# Import inválido detectado
🚨 Imports inválidos detectados:

❌ src/components/Button.tsx
   import: "@/shared/components/ui/badge"
   caminho: src/shared/components/ui/badge

💡 Verifique se:
   - O arquivo existe no caminho correto
   - O alias está configurado corretamente
   - O nome do arquivo está correto (maiúsculas/minúsculas)

   Adicione "skip-import-check" para ignorar.
```

**Benefícios:**
- ❌ Previne erros: "Module not found: Can't resolve '@/...'"
- ⚡ Detecta antes de rodar o projeto
- 🎯 Garante que Claude não invente imports inexistentes

---

### 3. **Lint After Edit Hook** (`lint-after-edit-hook.js`)
Roda ESLint automaticamente após edições de código.

**Quando roda:** Após operações de `Edit`, `Write` ou `Bash` (`tool-use`)

**O que faz:**
- 🔍 Roda lint **apenas nos arquivos editados** (rápido!)
- 🛡️ **Detecta comandos Bash perigosos** (`mv`, `cp`, `rm`, `sed`, `awk`, etc)
- 🔄 Se usar Bash para mover/copiar arquivos, roda lint no projeto completo
- ⚠️ Detecta erros e warnings do ESLint
- 🔴 **Bloqueia apenas em caso de ERROS** (warnings não bloqueiam)
- ⏭️ Pula automaticamente arquivos não-lintáveis (.json, .css, etc)
- 💡 Permite bypass com palavra-chave `skip-lint`

**Exemplo:**
```bash
# Lint detectou erro
🔴 2 erro(s)
🟡 3 warning(s)

Primeiros erros:
...

💡 Execute "pnpm lint:fix" para corrigir automaticamente
   ou adicione "skip-lint" na mensagem para ignorar.
```

**Comportamento:**
- ✅ **Warnings**: Mostra mas permite continuar
- 🛑 **Erros**: Bloqueia até corrigir
- ⚡ **Performance**: Só verifica arquivos `.ts`, `.tsx`, `.js`, `.jsx` editados
- 🔄 **Comandos Bash**: Se detectar `mv`, `cp`, `rm`, etc., roda lint no projeto completo por segurança

**Comandos Bash detectados:**
- `mv` (mover arquivos/pastas)
- `cp` (copiar arquivos/pastas)
- `rm` (remover arquivos/pastas)
- `mkdir` (criar diretórios)
- `touch` (criar arquivos)
- `sed`, `awk` (editar arquivos via Bash)

---

## 🚀 Setup

### Estrutura de Arquivos

```
.claude/
├── hooks.json                      # Configuração dos hooks
├── check-dependencies-hook.js      # Hook de dependências
├── validate-imports-hook.js        # Hook de validação de imports
├── lint-after-edit-hook.js         # Hook de lint
├── tool-use-orchestrator.js        # Orquestrador de múltiplos hooks
└── README.md                       # Este arquivo
```

### Como Funciona

Os hooks são executados automaticamente pelo Claude Code em momentos específicos:

1. **`user-prompt-submit`**: Antes de processar cada mensagem do usuário
2. **`tool-use`**: Após usar ferramentas de edição (`Edit`, `Write`, `Bash`)

O hook `tool-use` usa um **orquestrador** que executa múltiplos checks em sequência:
- Primeiro valida imports (validate-imports-hook)
- Depois roda o lint (lint-after-edit-hook)
- Se qualquer um falhar, o processo é bloqueado

### Configuração (`hooks.json`)

```json
{
  "user-prompt-submit": {
    "command": "node",
    "args": [".claude/check-dependencies-hook.js"],
    "description": "Prevent modifying dependencies with <10 days"
  },
  "tool-use": {
    "command": "node",
    "args": [".claude/tool-use-orchestrator.js"],
    "description": "Run multiple checks: import validation + lint"
  }
}
```

---

## 🎯 Palavras-chave de Bypass

| Hook | Palavra-chave | Uso |
|------|---------------|-----|
| Dependency Check | `force` | Instalar pacote não confiável |
| Import Validation | `skip-import-check` | Pular validação de imports |
| Lint After Edit | `skip-lint` | Pular verificação de lint |

**Exemplo:**
```bash
# Dependency Check
"instalar biblioteca-nova force"

# Import Validation
"adicionar import do componente skip-import-check"

# Lint After Edit
"adicionar console.log no arquivo skip-lint"

# Múltiplos bypasses
"fazer mudanças skip-import-check skip-lint"
```

---

## 🔧 Comandos Úteis

```bash
# Testar hook de dependências
echo '{"prompt":"instalar axios","tool_uses":[]}' | node .claude/check-dependencies-hook.js

# Testar hook de imports
echo '{"prompt":"test","tool_uses":[{"tool_name":"Edit","tool_input":{"file_path":"src/test.tsx","new_string":"import { X } from \"@/fake/path\""}}]}' | node .claude/validate-imports-hook.js

# Testar orquestrador completo
echo '{"prompt":"test","tool_uses":[{"tool_name":"Edit","tool_input":{"file_path":"src/test.tsx","new_string":"import { X } from \"@/fake/path\""}}]}' | node .claude/tool-use-orchestrator.js

# Rodar lint manualmente
pnpm lint

# Corrigir erros de lint automaticamente
pnpm lint:fix

# Verificar tipos TypeScript
pnpm type-check
```

---

## 📝 Notas

### Por que validar imports?

Claude às vezes "inventa" imports de arquivos que não existem, causando erros de build como:
```
Module not found: Can't resolve '@/shared/components/ui/badge'
```

O Import Validation Hook previne isso verificando se todos os arquivos importados realmente existem no projeto **antes** de salvar, economizando tempo de debug.

### Por que apenas erros bloqueiam no Lint Hook?

**Warnings** são avisos que não quebram o código. Bloquear em warnings travaria o desenvolvimento desnecessariamente.

**Erros** indicam problemas reais que impedem o código de funcionar corretamente.

Se você quiser que warnings também bloqueiem, ajuste a configuração do ESLint em `eslint.config.mjs`.

### Por que verificar dependências?

Ataques de supply chain (typosquatting, pacotes maliciosos) são comuns no npm. Este hook adiciona uma camada de proteção validando pacotes antes da instalação.

### Performance

O Lint Hook **só roda nos arquivos editados**, não no projeto inteiro. Isso garante velocidade mesmo em grandes projetos.

---

## 🤝 Contribuindo

Para adicionar um novo hook:

1. Crie o arquivo `.js` em `.claude/`
2. Adicione a configuração em `hooks.json`
3. Documente aqui no README
4. Teste manualmente antes de commitar

---

**Última atualização:** Outubro 2025
