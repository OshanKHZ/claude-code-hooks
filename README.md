# Claude Code TypeScript Hooks

Production-ready hooks for [Claude Code](https://claude.com/claude-code) that automatically validate dependencies, imports, linting, and formatting.

## 🚀 Quick Start

1. **Copy hooks to your project**:
   ```bash
   cp -r typescript-react /path/to/your/project/.claude/hooks
   ```

2. **Configure Claude Code** (`~/.claude/settings.json`):
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

3. **Done!** All validations run automatically.

> **Note**: Claude Code only allows **one hook per event**. The orchestrator chains multiple hooks together.

## 📦 What's Included

### [typescript-react](./typescript-react/)

Hooks for TypeScript/React/Next.js projects:

| Hook | Triggers On | Purpose |
|------|-------------|---------|
| `check-dependencies` | Bash commands | Blocks malicious packages & typosquatting |
| `validate-imports` | Edit/Write | Validates import paths exist |
| `lint-after-edit` | Edit/Write | Runs ESLint --fix |
| `format-on-edit` | Edit/Write | Runs Prettier --write |
| `orchestrator` | PostToolUse | Chains all hooks together |

[→ Full documentation](./typescript-react/README.md)

## 🔧 How It Works

```
Claude runs Bash → orchestrator.js
                   ├─ check-dependencies.js ✓ Validates package install
                   ├─ validate-imports.js   (skips - not Edit/Write)
                   ├─ lint-after-edit.js    (skips - not Edit/Write)
                   └─ format-on-edit.js     (skips - not Edit/Write)

Claude edits file → orchestrator.js
                   ├─ check-dependencies.js (skips - not Bash)
                   ├─ validate-imports.js   ✓ Checks imports exist
                   ├─ lint-after-edit.js    ✓ Runs ESLint --fix
                   └─ format-on-edit.js     ✓ Runs Prettier
```

Each hook is smart enough to skip if it doesn't apply to the current tool.

## ✅ Example Validations

**Blocked:**
- `pnpm add etherum` → 🚨 TYPO: did you mean "ethereum"?
- `pnpm add unknown-pkg` → ⚠️ Package not in trusted list
- `import { X } from "@/missing"` → ❌ File doesn't exist
- ESLint errors that can't be auto-fixed → ❌ Fix errors first

**Allowed:**
- `pnpm add lodash` → ✅ Trusted package
- `pnpm add unknown-pkg --force` → ✅ Force bypass
- Valid imports → ✅ Auto-formatted with Prettier

## 🛠️ Creating Custom Hooks

### 1. Create hook file

```javascript
const stdin = require('process').stdin;
const chunks = [];

stdin.on('data', chunk => chunks.push(chunk));
stdin.on('end', () => {
  const { event, toolName, toolInput } = JSON.parse(Buffer.concat(chunks));

  // Skip if not relevant
  if (event !== 'PostToolUse' || toolName !== 'Edit') {
    console.log(JSON.stringify({ status: 'ok' }));
    process.exit(0);
  }

  // Your validation logic
  const isValid = true; // Replace with actual check

  if (!isValid) {
    console.log(JSON.stringify({
      status: 'blocked',
      message: '❌ Validation failed'
    }));
    process.exit(1);
  }

  console.log(JSON.stringify({ status: 'ok' }));
  process.exit(0);
});
```

### 2. Add to orchestrator

```javascript
const hooks = [
  'check-dependencies.js',
  'validate-imports.js',
  'lint-after-edit.js',
  'format-on-edit.js',
  'your-hook.js'  // Add here
];
```

### 3. Test it

```bash
echo '{"event":"PostToolUse","toolName":"Edit","toolInput":{"file_path":"test.ts"}}' | node your-hook.js
```

## 📚 Hook Input Format

```typescript
{
  event: "PostToolUse";
  toolName: "Edit" | "Write" | "Bash" | "Read" | ...;
  toolInput: {
    file_path?: string;      // For Edit/Write
    command?: string;        // For Bash
    new_string?: string;     // For Edit
    content?: string;        // For Write
  };
}
```

## 🤝 Contributing

Want to add hooks for other languages/frameworks?

1. Create a folder: `python/`, `go/`, `rust/`, etc.
2. Add your hooks and orchestrator
3. Create a README
4. Submit a PR!

## 📝 License

MIT - Free to use in any project

---

**Questions?** Check the [Claude Code docs](https://docs.claude.com/claude-code) or open an issue.
