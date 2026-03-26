# E2E — Playwright Screenshots & Tests

## Purpose

Playwright-based scripts to capture UI screenshots for documentation and run E2E tests.

## Structure

```
e2e/
├── package.json             # Dependencies (playwright)
├── playwright.config.js     # Base URL, screenshot dir, credentials, viewport
├── update-screenshots.sh    # Shell script to update screenshots (with change detection)
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

## Prerequisites

- Samba DC + replica running: `cd docker && docker compose --profile replica up -d`
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
