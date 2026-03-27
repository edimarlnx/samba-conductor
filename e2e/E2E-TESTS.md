# E2E Tests — Samba Conductor

Comprehensive end-to-end test suite covering all features of the Samba Conductor web application.

## Overview

| Suites | Tests | Runner               | Browser           |
|--------|-------|----------------------|-------------------|
| 15     | 65    | Node.js + Playwright | Chromium (Docker) |

## Prerequisites

- **Docker** and **Docker Compose** installed

## Running Tests

### Docker Compose (recommended for CI)

Zero host dependencies — builds all-in-one image (Samba DC + MongoDB + Meteor) and runs Playwright.

```bash
cd e2e
./run-tests.sh --compose              # Run all tests
./run-tests.sh --compose users        # Filter by suite
./run-tests.sh --compose --no-cache   # Rebuild without Docker cache
```

This builds two containers:

- **app** — All-in-one image (`docker/all-in-one/Dockerfile`): Samba 4 AD DC + MongoDB + Meteor webapp, managed by
  Supervisor
- **tests** — Playwright runner (`mcr.microsoft.com/playwright:v1.58.2-noble`)

> **Note:** Cron jobs are disabled in E2E via `METEOR_SETTINGS` (`cron.enabled = false`) to prevent background tasks
> from interfering with tests.

### Host mode (for development)

Requires Meteor and Samba running on the host:

```bash
# Start Samba DC
cd docker && docker compose up -d

# Start Meteor (ensure docker group is effective for samba-tool access)
sg docker -c "cd web && meteor npm start"

# Run tests
cd e2e
./run-tests.sh                        # Run all tests
./run-tests.sh auth                   # Filter by suite
./run-tests.sh users
```

## Results

After execution, results are saved to `e2e/results/`:

```
results/
├── screenshots/          # PNG screenshot per test (success and failure)
│   ├── auth-login-valid-success.png
│   ├── users-create-user-success.png
│   └── ...
└── report.html           # HTML report with summary, status, and embedded screenshots
```

### CI Integration (GitHub Actions)

```yaml
- name: Run E2E Tests
  run: cd e2e && ./run-tests.sh --compose

- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: e2e-results
    path: e2e/results/
```

## Test Suites

### auth (5 tests)

| Test                     | Description                               |
|--------------------------|-------------------------------------------|
| login-valid              | Login with admin credentials              |
| dashboard-loaded         | Dashboard renders after login             |
| logout                   | Logout navigates to login page            |
| login-invalid            | Error shown for bad credentials           |
| redirect-unauthenticated | Unauthenticated access redirects to login |

### dashboard (2 tests)

| Test         | Description                                  |
|--------------|----------------------------------------------|
| stats-cards  | Stat cards (users, groups) render            |
| status-links | DR key and sync account status links visible |

### users (7 tests)

| Test           | Description                                |
|----------------|--------------------------------------------|
| list-users     | Navigate to users page, table renders      |
| create-user    | Fill form, submit, user created in AD      |
| verify-created | Created user appears in list               |
| edit-user      | Navigate to edit form, change fields, save |
| toggle-disable | Disable user via confirm modal             |
| toggle-enable  | Re-enable user via confirm modal           |
| delete-user    | Delete user via confirm modal              |

### groups (5 tests)

| Test           | Description                              |
|----------------|------------------------------------------|
| list-groups    | Navigate to groups page, table renders   |
| create-group   | Fill form, submit, group created in AD   |
| verify-created | Created group appears in list            |
| view-edit-page | Navigate to edit page, verify group info |
| delete-group   | Delete group via confirm modal           |

### ous (4 tests)

| Test      | Description                        |
|-----------|------------------------------------|
| view-tree | Navigate to OUs page, tree renders |
| create-ou | Create new OU via modal            |
| select-ou | Find and select created OU in tree |
| delete-ou | Delete OU via confirm modal        |

### computers (5 tests)

| Test            | Description                               |
|-----------------|-------------------------------------------|
| list-computers  | Navigate to computers page, table renders |
| create-computer | Create computer via modal                 |
| verify-created  | Created computer appears in list          |
| view-details    | Open detail panel, verify close button    |
| delete-computer | Delete computer via confirm modal         |

### service-accounts (5 tests)

| Test           | Description                                      |
|----------------|--------------------------------------------------|
| list-accounts  | Navigate to service accounts page, table renders |
| create-account | Create gMSA via modal                            |
| verify-created | Created account appears in list                  |
| view-details   | Open detail panel, verify close button           |
| delete-account | Delete account via confirm modal                 |

### dns (5 tests)

| Test          | Description                       |
|---------------|-----------------------------------|
| page-loads    | Navigate to DNS page              |
| view-zones    | DNS zones load from AD            |
| expand-zone   | Expand first zone to show records |
| add-record    | Add A record via modal            |
| delete-record | Delete record via confirm modal   |

### gpos (4 tests)

| Test           | Description                  |
|----------------|------------------------------|
| list-gpos      | Navigate to GPOs page        |
| create-gpo     | Create GPO via modal         |
| verify-created | Created GPO appears in list  |
| delete-gpo     | Delete GPO via confirm modal |

### domain (2 tests)

| Test              | Description                       |
|-------------------|-----------------------------------|
| info-section      | Domain info section renders       |
| functional-levels | Functional levels section renders |

### oauth-clients (4 tests)

| Test           | Description                             |
|----------------|-----------------------------------------|
| list-clients   | Navigate to OAuth clients page          |
| create-client  | Create client, verify credentials modal |
| verify-in-list | Created client appears in list          |
| delete-client  | Delete client via confirm modal         |

### oauth-realms (4 tests)

| Test           | Description                    |
|----------------|--------------------------------|
| list-realms    | Navigate to OAuth realms page  |
| default-exists | Default realm is present       |
| create-realm   | Create new realm               |
| delete-realm   | Delete realm via confirm modal |

### settings (4 tests)

| Test                 | Description                         |
|----------------------|-------------------------------------|
| page-loads           | Navigate to settings page           |
| toggle-feature       | Toggle a feature on/off             |
| save-fields          | Save field configuration            |
| sync-account-section | Sync account config section visible |

### selfservice (6 tests)

| Test                   | Description                                    |
|------------------------|------------------------------------------------|
| home-page              | Self-service home renders                      |
| home-links             | Edit profile and change password links present |
| profile-page           | Navigate to profile page                       |
| profile-cancel         | Cancel returns to home                         |
| change-password-page   | Navigate to change password page               |
| change-password-cancel | Cancel returns to home                         |

### dr (3 tests)

| Test              | Description                        |
|-------------------|------------------------------------|
| page-loads        | Navigate to disaster recovery page |
| key-section       | DR key management section visible  |
| s3-config-visible | S3 configuration section check     |

## Architecture

- **Runner:** `tests/run-all.js` — orchestrates all suites, collects results, generates report
- **Helpers:** `tests/helpers.js` — login, navigation, screenshot capture, TestReporter class
- **Docker:** All-in-one image for Samba+MongoDB+Meteor; Playwright in `mcr.microsoft.com/playwright:v1.58.2-noble`
- **Timeouts:** LDAP operations use 60s timeout, LDAP writes use 45s, UI interactions use 10s
- **Screenshots:** Captured after each test (success or failure) in `results/screenshots/`

## Selectors

All tests use `data-e2e` attributes for element selection, following the convention:

```
data-e2e="<context>-<type>-<identifier>"
```

Examples:

- `data-e2e="login-input-username"` — login form username input
- `data-e2e="users-btn-new"` — new user button
- `data-e2e="confirm-modal-btn-confirm"` — confirm modal button
