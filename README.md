# Claude Code Hooks

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-166%20passing-brightgreen.svg)](./TESTING_QUICKSTART.md)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com)

Production-ready hooks for [Claude Code](https://claude.com/claude-code) with automatic validation, type checking, linting, and formatting.

## 🚀 Quick Start

1. Choose a hook collection below
2. Copy to your project: `cp -r collection-name /path/to/.claude/hooks`
3. Configure in `~/.claude/settings.json`
4. Done! Hooks run automatically

## 📁 Hook Collections

### [typescript-react/](./typescript-react/)

For TypeScript/React/Next.js projects

**Includes:**
- ✅ Dependency validation (blocks malicious packages)
- ✅ Import validation (checks paths exist)
- ✅ TypeScript type checking (SHA256 cache, < 5ms)
- ✅ ESLint auto-fix
- ✅ Prettier auto-format

**Performance:** < 5ms (cached) to 500ms (full check)

[→ View typescript-react documentation](./typescript-react/README.md)

---

### Coming Soon

- **python/** - Black, mypy, ruff
- **go/** - gofmt, golint, go vet
- **rust/** - rustfmt, clippy

Want to contribute? See [Contributing](#-contributing) below.

## ⚡ Key Features

### SHA256 Caching
TypeScript config validation in < 5ms (95% faster than tsc incremental)

### Smart Execution
Each hook skips automatically if not relevant (Bash hook skips on Edit, etc.)

### One Hook Rule
Claude Code allows only **one hook per event**. We use an orchestrator to chain multiple hooks.

## 🤝 Contributing

**Add a new language/framework:**

1. Create folder: `mkdir python/`
2. Add hooks: `check.py`, `format.py`, `orchestrator.py`
3. Create `README.md` with setup instructions
4. Update this main README with link
5. Submit PR

**Improve existing hooks:**

See individual collection READMEs for improvement ideas.

## 🧪 Testing

Comprehensive test suite with 166+ passing tests covering all hooks.

```bash
npm install    # Install test dependencies
npm test       # Run all tests
```

See [TESTING_QUICKSTART.md](./TESTING_QUICKSTART.md) for details.

## 📖 Documentation

- [typescript-react/](./typescript-react/) - Full TypeScript/React docs
- [TESTING_QUICKSTART.md](./TESTING_QUICKSTART.md) - Test guide
- [CLAUDE.md](./CLAUDE.md) - AI context & architecture
- [settings.example.json](./settings.example.json) - Config example

## 📝 License

MIT - Free to use in any project

---

**Questions?** Check the [Claude Code docs](https://docs.claude.com/claude-code) or open an issue.

**Credits:** Inspired by [bartolli/claude-code-typescript-hooks](https://github.com/bartolli/claude-code-typescript-hooks)
