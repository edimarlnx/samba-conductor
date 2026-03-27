# E2E — Playwright Screenshots & Tests

## Purpose

Playwright-based scripts to capture UI screenshots for documentation and run E2E tests.

## Structure

```
e2e/
├── package.json             # Dependencies (playwright)
├── playwright.config.js     # Base URL, screenshot dir, credentials, viewport
├── run-tests.sh             # Run E2E tests (host or Docker Compose mode)
├── docker-compose.yml       # All-in-one + Playwright test runner
├── update-screenshots.sh    # Shell script to update screenshots (with change detection)
├── tests/
│   ├── helpers.js           # Login, navigation, screenshot capture, TestReporter
│   ├── run-all.js           # Orchestrates all suites, generates HTML report
│   └── *.spec.js            # Test suites (auth, users, groups, etc.)
├── screenshots/
│   └── capture-all.js       # Captures all pages, compares with existing, updates only changed
└── CLAUDE.md                # This file
```

## Running

```bash
cd e2e
npm install
npx playwright install chromium

# Capture all, update only changed files
./update-screenshots.sh

# Filter by group or name
./update-screenshots.sh admin           # Only admin pages
./update-screenshots.sh selfservice     # Only self-service pages
./update-screenshots.sh auth            # Only login pages
./update-screenshots.sh dashboard       # Screenshots matching "dashboard"

# Force update all (ignore diff)
./update-screenshots.sh --force
```

Screenshots are saved to `docs/screenshots/`. Only files that actually changed are overwritten.

## Running E2E Tests

```bash
# Docker Compose — all-in-one image, zero host dependencies
./run-tests.sh --compose
./run-tests.sh --compose users          # Filter by suite
./run-tests.sh --compose --no-cache     # Rebuild without Docker cache

# Host mode — requires Meteor + Samba running on host
./run-tests.sh                          # Run all tests
./run-tests.sh auth                     # Filter by suite
```

Docker Compose mode uses the all-in-one image (Samba + MongoDB + Meteor in a single container).

## Prerequisites (host mode)

- Samba DC running: `cd docker && docker compose up -d`
- Meteor app running: `cd web && meteor npm start`
- Default: `http://localhost:4080` (override with `BASE_URL` env var)

## Adding New Screenshots

1. Add a capture function in `screenshots/capture-all.js`
2. Add entry to the `SCREENSHOTS` array with `name`, `group`, and `capture` function
3. Run `./update-screenshots.sh <name>` to test
4. Reference in docs as `![Alt](../screenshots/<name>.png)`

## Conventions

- Use `data-e2e` selectors for all interactions: `[data-e2e="login-input-username"]`
- Convention: `data-e2e="<context>-<type>-<identifier>"`
- Types: `input`, `btn`, `link`, `select`, `toggle`, `checkbox`, `search`, `card`
- Screenshot naming: `<area>-<page>.png` (e.g., `admin-users.png`, `selfservice-home.png`)
- Groups: `auth`, `admin`, `selfservice`
