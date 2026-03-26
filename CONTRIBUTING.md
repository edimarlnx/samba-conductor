# Contributing to Samba Conductor

Thank you for your interest in contributing to Samba Conductor! This document provides guidelines and information for
contributors.

## How to Contribute

### Reporting Issues

- Use [GitHub Issues](https://github.com/your-org/samba-conductor/issues) to report bugs or request features
- Search existing issues before creating a new one
- Include steps to reproduce bugs, expected behavior, and actual behavior
- Include your environment: OS, Docker version, Meteor version, browser

### Pull Requests

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following the code standards below
4. Run linting: `cd web && meteor npm run quave-check`
5. Commit with a descriptive message
6. Push to your fork and open a Pull Request

### Code Standards

- **JavaScript only** (no TypeScript)
- **Functional programming** with named functions and named parameters
- **Async/await** for all asynchronous operations (Meteor 3.4)
- **Tailwind CSS** with semantic color tokens (`bg-surface`, `text-fg`, `bg-accent`)
- **Code comments in English**
- Run `meteor npm run quave-check` (ESLint + Prettier) before committing

### Project Structure

- `web/` — Meteor application (see `web/CLAUDE.md` for detailed standards)
- `docker/` — Docker images and compose files
- `docs/` — User and admin documentation
- `e2e/` — Playwright screenshots and tests

### Development Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/edimarlnx/samba-conductor.git
cd samba-conductor

# Or if already cloned:
git submodule update --init --recursive

# Start Samba DC
cd docker
docker compose up -d

# Start the web app
cd ../web
meteor npm install
meteor npm start
```

See [Getting Started](docs/admin/getting-started.md) for full setup instructions.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are
expected to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
