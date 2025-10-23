# TypeScript React Hooks

Production-ready hooks for TypeScript React/Next.js projects with automatic validation, linting, and formatting.

## 🎯 What's Included

| Hook | Event | Purpose |
|------|-------|---------|
| `check-dependencies.js` | `user-prompt-submit` | Validates package installations to prevent malicious dependencies |
| `orchestrator.js` | `PostToolUse` | Chains multiple hooks: validate → lint → format |
| `validate-imports.js` | (via orchestrator) | Validates import paths exist and respect feature boundaries |
| `lint-after-edit.js` | (via orchestrator) | Auto-runs ESLint with `--fix` after file edits |
| `format-on-edit.js` | (via orchestrator) | Auto-formats files with Prettier after edits |

## 🚀 Setup

### 1. Install in Your Project

Copy the `typescript-react` folder to your project or a shared location:

```bash
# Option A: In your project
cp -r typescript-react /path/to/your/project/.claude/hooks/

# Option B: Global location (recommended for reuse)
cp -r typescript-react ~/claude-hooks/typescript-react/
```

### 2. Configure Claude Code

Edit your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "hooks": [
    {
      "name": "check-dependencies",
      "event": "user-prompt-submit",
      "command": "node ~/claude-hooks/typescript-react/check-dependencies.js"
    },
    {
      "name": "post-edit-orchestrator",
      "event": "PostToolUse",
      "command": "node ~/claude-hooks/typescript-react/orchestrator.js"
    }
  ]
}
```

**Important:** Update the paths to match where you copied the hooks!

### 3. Verify Setup

Test that hooks are working:

```bash
# Test dependency check
echo '{"event":"user-prompt-submit","userMessage":"pnpm add lodash"}' | node check-dependencies.js

# Test orchestrator
echo '{"event":"PostToolUse","toolName":"Edit","toolInput":{"file_path":"test.ts"}}' | node orchestrator.js
```

## 📋 Requirements

Your project needs:

- **ESLint** (for `lint-after-edit.js`)
- **Prettier** (for `format-on-edit.js`)
- **TypeScript** (for import validation)

## 🔧 How It Works

### Workflow

```
┌─────────────────────────────────────────────────────────┐
│ User: "pnpm add some-package"                           │
└─────────────────────────────────────────────────────────┘
                        ↓
          ┌─────────────────────────┐
          │ check-dependencies.js   │
          │ - Validates package     │
          │ - Checks against list   │
          └─────────────────────────┘
                        ↓
          ✅ Allowed / ❌ Blocked

┌─────────────────────────────────────────────────────────┐
│ Claude edits file.ts                                     │
└─────────────────────────────────────────────────────────┘
                        ↓
          ┌─────────────────────────┐
          │   orchestrator.js       │
          └─────────────────────────┘
                        ↓
          ┌─────────────────────────┐
          │ validate-imports.js     │
          │ - Check imports exist   │
          │ - Verify boundaries     │
          └─────────────────────────┘
                        ↓
          ┌─────────────────────────┐
          │ lint-after-edit.js      │
          │ - Run ESLint --fix      │
          │ - Auto-fix issues       │
          └─────────────────────────┘
                        ↓
          ┌─────────────────────────┐
          │ format-on-edit.js       │
          │ - Run Prettier --write  │
          │ - Format code           │
          └─────────────────────────┘
                        ↓
          ✅ Success / ❌ Blocked
```

### Execution Order

The orchestrator runs hooks in this order:

1. **validate-imports** - Fast, blocks invalid imports early
2. **lint-after-edit** - Catches code quality issues
3. **format-on-edit** - Final formatting pass

If any hook blocks, the chain stops and Claude sees the error.

## ⚙️ Customization

### Add More Hooks

Edit `orchestrator.js`:

```javascript
const hooks = [
  'validate-imports.js',
  'lint-after-edit.js',
  'format-on-edit.js',
  'your-custom-hook.js'  // Add here
];
```

### Disable a Hook

Comment out in `orchestrator.js`:

```javascript
const hooks = [
  'validate-imports.js',
  // 'lint-after-edit.js',  // Disabled
  'format-on-edit.js',
];
```

### Customize Blocked Packages

Edit `check-dependencies.js` and modify the `suspiciousPatterns` array.

### Customize Feature Boundaries

Edit `validate-imports.js` and modify the `FEATURE_BOUNDARIES` rules.

## 🐛 Troubleshooting

### "ESLint not found"

Install ESLint:
```bash
pnpm add -D eslint
```

### "Prettier not found"

Install Prettier:
```bash
pnpm add -D prettier
```

### "Hook not running"

Check Claude Code settings:
```bash
cat ~/.claude/settings.json
```

Verify paths are absolute and correct.

### "Hook blocking everything"

Check hook logs in Claude Code output. Each hook prints its status:
```
[validate-imports] ✓ All imports valid
[lint-after-edit] ✓ Linted: src/file.ts
[format-on-edit] ✓ Formatted: src/file.ts
```

## 📖 Hook Details

### check-dependencies.js

**Purpose:** Prevent installation of malicious/unwanted packages

**Blocks:**
- Suspicious package patterns (typosquatting, crypto miners, etc.)
- Can be customized with your own blocklist

**Example:**
```
❌ Blocked: Package "etherum" is suspicious (did you mean "ethereum"?)
```

### validate-imports.js

**Purpose:** Ensure imports are valid and respect feature boundaries

**Validates:**
- Import paths exist on disk
- Feature boundaries (e.g., `features/auth` can't import from `features/dashboard`)
- Shared layer usage is allowed from anywhere

**Example:**
```
❌ Blocked: Import path doesn't exist: @/components/NonExistent
❌ Blocked: Feature boundary violation: auth → dashboard
```

### lint-after-edit.js

**Purpose:** Auto-fix linting issues with ESLint

**Behavior:**
- Runs `eslint --fix` on edited files
- Blocks if unfixable errors remain
- Skips non-TypeScript/JavaScript files

**Example:**
```
✓ Linted and fixed: src/components/Button.tsx
❌ Blocked: ESLint errors remain in src/utils/api.ts
```

### format-on-edit.js

**Purpose:** Auto-format code with Prettier

**Behavior:**
- Runs `prettier --write` on edited files
- Uses project's Prettier config
- Skips if Prettier not installed

**Example:**
```
✓ Formatted: src/components/Modal.tsx
```

## 🤝 Contributing

Improvements welcome! Common enhancements:

- [ ] Add TypeScript type checking hook
- [ ] Add test runner hook
- [ ] Add commit message validation
- [ ] Add bundle size checker

## 📝 License

MIT
