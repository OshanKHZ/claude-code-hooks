# Claude Code Hooks

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

## 📖 Documentation

- [typescript-react/](./typescript-react/) - Full TypeScript/React docs
- [CLAUDE.md](./CLAUDE.md) - AI context & architecture
- [settings.example.json](./settings.example.json) - Config example

## 📝 License

MIT - Free to use in any project

---

**Questions?** Check the [Claude Code docs](https://docs.claude.com/claude-code) or open an issue.

**Credits:** Inspired by [bartolli/claude-code-typescript-hooks](https://github.com/bartolli/claude-code-typescript-hooks)
