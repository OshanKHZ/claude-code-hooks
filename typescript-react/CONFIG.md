# Configuration Guide

The hooks system supports centralized configuration via `config.json`.

## Configuration File

Create/edit `.claude/hooks/config.json`:

```json
{
  "typescript": {
    "enabled": true,
    "timeout": 15000,
    "showDependencyErrors": false,
    "skipLibCheck": true
  },
  "eslint": {
    "enabled": true,
    "autofix": true,
    "timeout": 30000
  },
  "prettier": {
    "enabled": true,
    "timeout": 10000
  },
  "imports": {
    "enabled": true,
    "checkFeatureBoundaries": true,
    "timeout": 5000
  },
  "dependencies": {
    "enabled": true,
    "trustedPackages": ["react", "next", "lodash"],
    "allowBypass": true,
    "typoDetection": true
  },
  "orchestrator": {
    "parallel": true,
    "stopOnFirstError": true,
    "verbose": false
  }
}
```

## Options Explained

### `typescript`
- `enabled`: Enable/disable TypeScript checking
- `timeout`: Max time in ms (default: 15000)
- `showDependencyErrors`: Show errors in dependencies
- `skipLibCheck`: Skip checking node_modules types

### `eslint`
- `enabled`: Enable/disable ESLint
- `autofix`: Auto-fix errors with --fix
- `timeout`: Max time in ms (default: 30000)

### `prettier`
- `enabled`: Enable/disable Prettier
- `timeout`: Max time in ms (default: 10000)

### `imports`
- `enabled`: Enable/disable import validation
- `checkFeatureBoundaries`: Validate feature boundaries
- `timeout`: Max time in ms (default: 5000)

### `dependencies`
- `enabled`: Enable/disable dependency checking
- `trustedPackages`: Array of trusted package names
- `allowBypass`: Allow --force to bypass checks
- `typoDetection`: Detect typosquatting

### `orchestrator`
- `parallel`: Run independent hooks in parallel (30% faster)
- `stopOnFirstError`: Stop on first error or collect all
- `verbose`: Show detailed execution logs

## Parallel Execution

By default, hooks run in parallel for better performance:

```
Sequential (old):  validate (50ms) → typecheck (200ms) → lint (300ms) → format (150ms) = 700ms
Parallel (new):    [validate + typecheck + lint] (300ms) → format (150ms) = 450ms
```

**~35% faster!**

Disable with:
```json
{
  "orchestrator": { "parallel": false }
}
```

## Temporarily Disable a Hook

Edit the hook file to add early exit:

```javascript
// At the top of any hook
const config = require('./shared-utils').loadConfig();
if (!config.typescript.enabled) {
  console.log(JSON.stringify({ status: 'ok' }));
  process.exit(0);
}
```

Or comment out in `orchestrator.js`:

```javascript
const parallelHooks = [
  'check-dependencies.js',
  'validate-imports.js',
  // 'typecheck-after-edit.js',  // Disabled
  'lint-after-edit.js',
];
```

## Add Custom Trusted Packages

```json
{
  "dependencies": {
    "trustedPackages": [
      "react",
      "next",
      "your-internal-package",
      "@your-org/design-system"
    ]
  }
}
```

## Performance Tuning

Adjust timeouts based on your project size:

```json
{
  "typescript": { "timeout": 30000 },  // Large project
  "eslint": { "timeout": 60000 },      // Many files
  "prettier": { "timeout": 5000 }      // Fast formatter
}
```
