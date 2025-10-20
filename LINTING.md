# 🔍 Configuração de Linting - Huma

## Visão Geral

O projeto usa **ESLint** com regras customizadas para garantir a integridade da arquitetura Feature-Based + Shared Resources.

## Hook Automático de Lint

### Como funciona

O projeto tem um **hook automático** (`.claude/lint-after-edit-hook.js`) que:

1. ✅ Detecta quando arquivos `.ts`, `.tsx`, `.js`, `.jsx` são editados
2. ✅ Roda `pnpm lint` automaticamente nesses arquivos
3. ✅ **Bloqueia** se encontrar erros de lint
4. ⚠️ Mostra warnings mas permite continuar

### Bypass do Hook

Se precisar ignorar temporariamente o lint, adicione `skip-lint` na sua mensagem:

```
"Faça X alteração no arquivo Y skip-lint"
```

## Comandos Disponíveis

```bash
# Rodar lint em todo o projeto
pnpm lint

# Corrigir automaticamente problemas
pnpm lint:fix

# Verificar tipos TypeScript
pnpm type-check

# Formatar código com Prettier
pnpm format

# Verificar formatação
pnpm format:check
```

## Regras de Arquitetura

### 🚫 Import Boundaries (Fronteiras de Importação)

#### ❌ NÃO FAÇA:

```typescript
// ❌ Importar diretamente de subpastas de features
import { LoginForm } from '@/features/auth/components/login-form'

// ❌ Imports relativos entre features
import { Dashboard } from '../../dashboard/Dashboard'

// ❌ Imports relativos de shared
import { Button } from '../../../shared/components/ui/button'

// ❌ Shared importando de features
// Em src/shared/components/header.tsx
import { LoginForm } from '@/features/auth' // 🚫 PROIBIDO!
```

#### ✅ FAÇA:

```typescript
// ✅ Importar através do index.tsx da feature
import { LoginForm } from '@/features/auth'

// ✅ Path aliases entre features
import { AppSidebar } from '@/features/dashboard'

// ✅ Path aliases para shared
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/utils'
import { useMobile } from '@/shared/hooks/use-mobile'

// ✅ Imports relativos DENTRO da mesma feature
// Em src/features/dashboard/components/app-sidebar.tsx
import { NavMain } from './nav-main'
import { NavUser } from './nav-user'
```

### 📐 Regras por Diretório

#### `src/features/` - Features

- ✅ Pode importar de `@/shared/*`
- ✅ Pode importar de outras features via `@/features/*`
- ✅ Prefira imports relativos dentro da mesma feature
- ❌ Não importe diretamente de subpastas de outras features

#### `src/shared/` - Recursos Compartilhados

- ✅ Pode importar de outros arquivos `@/shared/*`
- ❌ **NUNCA** pode importar de `@/features/*`
- 💡 Se precisar, inverta a dependência (feature importa shared, não o contrário)

#### `src/app/` - Next.js App Router

- ✅ Pode importar de qualquer lugar
- ✅ Apenas roteamento e layouts

## Regras de Código

### TypeScript

```typescript
// ✅ Variáveis não usadas começam com _
const _unusedVar = 'ok'

// ✅ Use type imports quando possível
import type { User } from '@/shared/types/user'

// ⚠️ Evite any (warning)
const data: any = {} // Warning: use tipo específico
```

### React/Next.js

```typescript
// ✅ Sempre use aspas tipográficas em JSX
<p>&ldquo;Texto entre aspas&rdquo;</p>

// ❌ Não use aspas diretas
<p>"Texto entre aspas"</p> // Erro!

// ⚠️ Prefira <Image> do next/image
<img src="/foto.jpg" /> // Warning
<Image src="/foto.jpg" width={100} height={100} /> // ✅
```

### Code Quality

```typescript
// ✅ Use const ao invés de let quando possível
const value = 10

// ❌ Nunca use var
var x = 10 // Erro!

// ⚠️ Console.log só em dev (warning)
console.log('debug') // Warning
console.error('erro') // ✅ OK
console.warn('aviso') // ✅ OK
```

## Exemplos Práticos

### ✅ Feature bem estruturada

```typescript
// src/features/auth/index.tsx
export { LoginForm } from './components/login-form'
export { useAuth } from './hooks/use-auth'
export type { AuthUser } from './types'

// src/features/auth/components/login-form.tsx
"use client"

import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/utils'
import { useAuth } from '../hooks/use-auth' // Import relativo dentro da feature

export function LoginForm() {
  // ...
}
```

### ✅ Usando a feature

```typescript
// src/app/login/page.tsx
import { LoginForm } from '@/features/auth' // ✅ Via index

export default function LoginPage() {
  return <LoginForm />
}
```

### ❌ Erros comuns

```typescript
// src/app/login/page.tsx
import { LoginForm } from '@/features/auth/components/login-form' // ❌ Direto da subpasta

// src/shared/components/header.tsx
import { useAuth } from '@/features/auth' // ❌ Shared importando feature

// src/features/dashboard/Dashboard.tsx
import { LoginForm } from '../../auth/components/login-form' // ❌ Import relativo entre features
```

## Integração com Claude Code

O hook `.claude/lint-after-edit-hook.js` é executado automaticamente após cada edição de código. Ele:

1. Detecta arquivos editados
2. Roda lint apenas nesses arquivos (rápido)
3. Mostra erros formatados
4. Sugere `pnpm lint:fix` para correções automáticas
5. Permite bypass com `skip-lint`

### Fluxo típico:

```
[Você edita arquivo]
  → Hook detecta
  → Roda lint
  → ✅ Passou: Continua
  → ❌ Erro: Bloqueia e mostra mensagem
```

## Troubleshooting

### "Import direto de subpasta de feature"

```
❌ Não importe diretamente de subpastas de features.
Use o index.tsx da feature (ex: @/features/auth)
```

**Solução:** Exporte o componente no `index.tsx` da feature e importe de lá.

### "Shared não pode importar de features"

```
🚫 Componentes shared NÃO podem importar de features.
Inverta a dependência!
```

**Solução:** Mova o código para a feature ou crie uma abstração em shared que a feature implementa.

### "Use path alias ao invés de import relativo"

```
❌ Use path alias @/features/* ao invés de imports
relativos entre features
```

**Solução:** Troque `../../feature/Component` por `@/features/feature`.

## Dicas

1. **Rode `pnpm lint:fix` frequentemente** - Muitos erros são auto-corrigíveis
2. **Use `skip-lint` com cautela** - Apenas para situações temporárias
3. **Respeite as boundaries** - Elas existem para manter o projeto escalável
4. **Exports controlados** - Só exponha o necessário no `index.tsx` das features

---

**Última atualização:** 13/01/2025