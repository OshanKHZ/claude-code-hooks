# TypeScript React Hooks

Production-ready hooks for TypeScript React/Next.js projects with automatic validation, type checking, linting, and formatting.

## 🎯 What's Included

| Hook | Triggers On | Purpose | Performance |
|------|-------------|---------|-------------|
| `check-dependencies.js` | Bash | Blocks malicious packages & typosquatting | < 10ms |
| `validate-imports.js` | Edit/Write | Validates import paths exist | < 50ms |
| `typecheck-after-edit.js` | Edit/Write | TypeScript type checking with SHA256 cache | < 5ms (cached) |
| `lint-after-edit.js` | Edit/Write | Runs ESLint --fix | 100-500ms |
| `format-on-edit.js` | Edit/Write | Runs Prettier --write | 50-200ms |
| `orchestrator.js` | PostToolUse | Chains all hooks together | Sum of active hooks |

## 🚀 Setup

### 1. Install in Your Project

```bash
# Copy to your project
cp -r typescript-react /path/to/your/project/.claude/hooks/
```

### 2. Configure Claude Code

Edit `~/.claude/settings.json`:

```json
{
  "hooks": [
    {
      "name": "orchestrator",
      "event": "PostToolUse",
      "command": "node /path/to/.claude/hooks/orchestrator.js"
    }
  ]
}
```

### 3. Done!

All validations run automatically when Claude edits files or runs commands.

## 📋 Requirements

- **TypeScript** (for typecheck)
- **ESLint** (for linting)
- **Prettier** (for formatting)

Install with: `pnpm add -D typescript eslint prettier`

## 🔧 How It Works

### Execution Order

```
Claude edits file.tsx → orchestrator.js
                        ├─ 1. check-dependencies  (skip - not Bash)
                        ├─ 2. validate-imports    ✓ Check imports exist
                        ├─ 3. typecheck           ✓ TypeScript errors
                        ├─ 4. lint                ✓ ESLint --fix
                        └─ 5. format              ✓ Prettier --write

Claude runs Bash → orchestrator.js
                   ├─ 1. check-dependencies      ✓ Validate package install
                   ├─ 2. validate-imports        (skip - not Edit/Write)
                   ├─ 3. typecheck               (skip - not Edit/Write)
                   ├─ 4. lint                    (skip - not Edit/Write)
                   └─ 5. format                  (skip - not Edit/Write)
```

Each hook is smart enough to skip if it doesn't apply.

## ⚡ Performance Optimization

### TypeScript Cache (SHA256)

The typecheck hook uses SHA256 hashing to cache tsconfig files:

- **First run**: ~100-200ms (builds cache)
- **Subsequent runs**: < 5ms (hash validation)
- **On config change**: Auto-rebuilds cache

Cache file: `.claude/hooks/tsconfig-cache.json`

### Why So Fast?

Instead of running TypeScript's incremental compiler (100-500ms), we:
1. Hash each tsconfig file (< 1ms)
2. Compare with stored hash (< 1ms)
3. Reuse config mapping (< 3ms)

**Result**: 95%+ faster on repeated runs

## ✅ Example Validations

### Blocked

```bash
pnpm add etherum
→ 🚨 TYPO: did you mean "ethereum"?

import { X } from "@/missing"
→ ❌ File doesn't exist

const x: string = 123
→ ❌ Type 'number' is not assignable to type 'string'

const unused = true; // ESLint error
→ ❌ 'unused' is assigned but never used
```

### Allowed

```bash
pnpm add lodash
→ ✅ Trusted package

import { Button } from "@/components/Button"
→ ✅ Valid import → Auto-formatted

const x: number = 123
→ ✅ Type correct → Linted → Formatted
```

## ⚙️ Customization

### Disable a Hook

Edit `orchestrator.js`:

```javascript
const hooks = [
  'check-dependencies.js',
  'validate-imports.js',
  // 'typecheck-after-edit.js',  // Disabled
  'lint-after-edit.js',
  'format-on-edit.js',
];
```

### Customize Trusted Packages

Edit `check-dependencies.js`:

```javascript
const TRUSTED_PACKAGES = [
  'react', 'next', 'typescript',
  'your-package-here'  // Add yours
];
```

### Customize TypeScript Config Detection

Edit `typecheck-after-edit.js`:

```javascript
const configs = [
  path.join(PROJECT_ROOT, 'tsconfig.json'),
  path.join(PROJECT_ROOT, 'tsconfig.custom.json'),  // Add custom
];
```

## 🐛 Troubleshooting

### "TypeScript not found"

```bash
pnpm add -D typescript
```

### "Typecheck is slow"

The first run builds the cache (~200ms). Subsequent runs are < 5ms.

Check cache: `cat .claude/hooks/tsconfig-cache.json`

### "Hook blocking everything"

Check Claude Code output for specific error messages. Each hook prints its status:

```
✅ TypeScript: src/file.ts
✅ Lint passed: src/file.ts
✅ Formatted: src/file.ts
```

### "Want to skip validation temporarily"

Use force flags:
- Dependencies: `pnpm add pkg --force`
- All hooks are always active (by design for code quality)

## 📖 Hook Details

### typecheck-after-edit.js

**Purpose**: Catch TypeScript errors before they become runtime bugs

**How it works**:
1. Detects edited `.ts/.tsx` files
2. Finds appropriate tsconfig (cached with SHA256)
3. Runs `tsc --noEmit --skipLibCheck`
4. Filters output to show only errors in edited file
5. Blocks if critical type errors found

**Performance**:
- Cache validation: < 5ms
- Type check: 1-10s (depends on project size)
- Timeout: 15s (then skip)

**Output**:
```
✅ TypeScript: src/components/Button.tsx
❌ TypeScript errors in src/utils/api.ts:
   error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
```

## 🤝 Contributing

Improvements welcome! Common requests:

- [ ] Parallel hook execution (currently sequential)
- [ ] Configurable timeouts per hook
- [ ] React-specific validations (hook rules, etc.)
- [ ] Bundle size impact checker

## 📝 License

MIT
