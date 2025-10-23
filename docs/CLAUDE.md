# Claude Code Hooks - AI Context

## Repository Purpose

This repository contains reusable hooks for Claude Code that enhance TypeScript development workflows with automatic validation, linting, and formatting.

## Key Concepts

### Hook Limitations
- **One hook per event**: Claude Code only allows registering ONE hook per event type
- **Event types**: `user-prompt-submit` and `PostToolUse`
- **Solution**: Use the orchestrator pattern to chain multiple hooks together

### Architecture

```
hooks/
├── typescript-react/          # React/Next.js projects
│   ├── check-dependencies.js  # Validates package installations
│   ├── validate-imports.js    # Validates import paths
│   ├── lint-after-edit.js     # Auto-lints with ESLint
│   ├── format-on-edit.js      # Auto-formats with Prettier
│   ├── orchestrator.js        # Chains hooks together
│   ├── hooks.json            # Hook registry
│   └── README.md             # Documentation
└── README.md                 # Main documentation
```

### Hook Communication

Hooks receive JSON via stdin:
```json
{
  "event": "PostToolUse",
  "toolName": "Edit",
  "toolInput": {
    "file_path": "/path/to/file.ts"
  }
}
```

Hooks respond via stdout:
```json
{
  "status": "ok",
  "message": "✓ Validation passed"
}
```

Or block:
```json
{
  "status": "blocked",
  "message": "❌ Error description"
}
```

## Adding New Hooks

### 1. Create hook file
Follow the pattern in existing hooks:
- Read JSON from stdin
- Validate/process
- Output status JSON
- Exit with code 0 (success) or 1 (blocked)

### 2. Add to orchestrator
Update the `hooks` array in `orchestrator.js` to include your hook in the execution chain.

### 3. Document
Add documentation to the relevant README explaining what the hook does and how to configure it.

## Project-Specific Integration

To use these hooks in a project:

1. Copy the hook collection folder (e.g., `typescript-react/`) to your project
2. Update `~/.claude/settings.json` with absolute paths to the hooks
3. Ensure your project has required dependencies (ESLint, Prettier, etc.)

## Customization

Each hook can be customized:
- `check-dependencies.js`: Modify `suspiciousPatterns` array
- `validate-imports.js`: Modify `FEATURE_BOUNDARIES` rules
- `lint-after-edit.js`: Respects project's `.eslintrc`
- `format-on-edit.js`: Respects project's `.prettierrc`

## Important Notes

- Hooks run synchronously and block Claude's actions if they fail
- Keep hooks fast - they run on every tool use
- Always provide clear error messages when blocking
- Test hooks before deploying to avoid disrupting workflows
