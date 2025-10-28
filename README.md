# Claude Code Hooks

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-164%20passing-brightgreen.svg)](./docs/TESTING_QUICKSTART.md)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com)

Production-ready hooks for [Claude Code](https://claude.com/claude-code) with automatic validation, type checking, linting, and formatting.

---

## 🚀 Quick Start

```bash
# 1. Copy hooks to your project
cp -r typescript-react /path/to/your/project/.claude/hooks/

# 2. Configure in settings
# Add to ~/.claude/settings.json:
{
  "hooks": [
    {
      "name": "orchestrator",
      "event": "PostToolUse",
      "command": "node /absolute/path/to/your/project/.claude/hooks/typescript-react/orchestrator.js"
    }
  ]
}

# 3. Install required dependencies in your project
npm install -D typescript eslint prettier

# 4. Done! Hooks run automatically
```

**Note:** Hooks should be installed in your project's `.claude/hooks/` directory, not globally, for proper path resolution.

---

## 📦 Available Hook Collections

| Collection | Languages | Hooks Included | Performance | Status |
|------------|-----------|----------------|-------------|---------|
| **[typescript-react/](./typescript-react/)** | TypeScript, React, Next.js | 5 hooks (dependencies, imports, typecheck, lint, format) | < 5ms cached | ✅ Ready |
| **python/** | Python | Black, mypy, ruff | TBD | 🚧 Coming Soon |
| **go/** | Go | gofmt, golint, go vet | TBD | 🚧 Coming Soon |
| **rust/** | Rust | rustfmt, clippy | TBD | 🚧 Coming Soon |

### TypeScript/React Collection Features

| Feature | Description | Performance |
|---------|-------------|-------------|
| 🛡️ **Dependency Validation** | Blocks malicious packages and typosquatting attacks | < 10ms |
| 🔍 **Import Validation** | Validates import paths (reads tsconfig.json paths) | < 50ms |
| ⚡ **TypeScript Checking** | SHA256 config cache + file results cache | < 5ms (cached) |
| 🎨 **ESLint Auto-fix** | Automatically fixes linting issues | 100-500ms |
| ✨ **Prettier Format** | Auto-formats code on save | 50-200ms |

**✨ New in v2.0:**
- 🌍 **Full English support** - All error messages now in English
- 📦 **Package manager detection** - Auto-detects npm/yarn/pnpm
- 🔍 **Dynamic project root** - Works anywhere in your project structure
- 🗂️ **Smart tsconfig parsing** - Reads actual path aliases from your config
- ⚙️ **Dependency checks** - Graceful handling when tools not installed
- 🗄️ **Better caching** - Cache files stored in `.claude/cache/` per project

[→ View full typescript-react documentation](./typescript-react/README.md)

---

## ⚡ Key Features

### 🚀 Blazing Fast Performance
- **SHA256 Caching**: TypeScript config validation in < 5ms (95% faster than tsc incremental)
- **Smart File Caching**: Results cached per file with 1-hour TTL
- **Parallel Execution**: Independent hooks run concurrently (35% faster)

### 🎯 Smart Execution
Each hook automatically skips when not relevant:
- Bash hooks skip on Edit/Write events
- TypeScript checks skip on non-.ts/.tsx files
- Format hooks skip excluded directories (node_modules, dist, etc.)

### 🔧 One Hook Rule Solution
Claude Code allows only **one hook per event**. We use an orchestrator pattern to chain multiple hooks together seamlessly.

---

## 🧪 Testing

Comprehensive unit test suite ensuring reliability and quality.

| Metric | Value |
|--------|-------|
| **Total Tests** | 167 tests |
| **Passing** | 164 (98.2%) |
| **Hook Tests** | 138/138 (100%) ✨ |
| **Utility Tests** | 26/29 (89.7%) |
| **Test Framework** | Vitest |

```bash
# Install dependencies
npm install

# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

[→ View testing guide](./docs/TESTING_QUICKSTART.md) | [→ View test report](./docs/TEST_REPORT.md)

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [typescript-react/README.md](./typescript-react/README.md) | Full TypeScript/React collection documentation |
| [docs/TESTING_QUICKSTART.md](./docs/TESTING_QUICKSTART.md) | Quick start guide for running tests |
| [docs/TEST_REPORT.md](./docs/TEST_REPORT.md) | Comprehensive test coverage report |
| [docs/CLAUDE.md](./docs/CLAUDE.md) | AI context and architecture notes |
| [docs/settings.example.json](./docs/settings.example.json) | Claude Code settings configuration example |
| [tests/README.md](./tests/README.md) | Test structure and patterns |

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Add a New Language/Framework

1. **Create collection folder**
   ```bash
   mkdir python/
   cd python/
   ```

2. **Add your hooks**
   - Create individual hook files
   - Create orchestrator to chain them
   - Add configuration file

3. **Document your hooks**
   - Create README.md with setup instructions
   - Document each hook's purpose and configuration
   - Add examples

4. **Update main README**
   - Add entry to Available Hook Collections table
   - Link to your documentation

5. **Submit PR**
   - Test your hooks thoroughly
   - Follow existing patterns
   - Update relevant docs

### Improve Existing Hooks

See individual collection READMEs for improvement ideas and contribution guidelines.

---

## 📝 License

MIT License - Free to use in any project, personal or commercial.

See [LICENSE](./LICENSE) for full details.

---

## 💬 Support

- 📚 [Claude Code Documentation](https://docs.claude.com/claude-code)
- 🐛 [Report Issues](https://github.com/your-username/claude-code-hooks/issues)
- 💡 [Request Features](https://github.com/your-username/claude-code-hooks/issues/new)
- 💬 [Discussions](https://github.com/your-username/claude-code-hooks/discussions)

---

<div align="center">

**Made with 🧡 for the Claude Code community**

⭐ Star this repo if you find it useful!

</div>
