# Samba Conductor — Web UI

## Tech Stack

- **Framework**: Meteor 3.4
- **Frontend**: React 19 with React Compiler
- **Styling**: Tailwind CSS 4 with semantic color tokens
- **Database**: MongoDB (via Meteor)
- **Schema**: SimpleSchema
- **Build Tools**: Rspack, PostCSS
- **Code Quality**: ESLint (@quave/eslint-config-quave), Prettier, Lefthook

## Code Standards

### Language & Architecture

- **JavaScript only** — Never use TypeScript
- **Async/await** — Meteor 3.4 uses native async/await. NO Fibers, NO `Promise.await`, NO `Meteor.wrapAsync`
- **Functional programming** — Avoid mutations and imperative patterns
- **Named parameters** — Always use objects with named properties `({ param1, param2 })`
- **Named functions** — No anonymous functions
- **ES6+ features** — Use modern JavaScript

### Code Organization

- **Feature-based folders** — `app/users/`, `app/groups/`, `app/dr/`, etc.
- **Single responsibility** — One component/collection per file
- **Relative imports** — Don't rely on tooling to resolve imports
- **Server-only samba code** — `app/samba/` modules are never imported client-side

### Quality Gates

**CRITICAL**: Before finishing any task, ALWAYS run:

1. `meteor npm run quave-check` (ESLint + Prettier)
2. Fix any errors or warnings
3. Only mark tasks complete after passing

### Security

- **Credentials per session** — `getReadCredentials()` for reads (fallback to sync account), `getWriteCredentials()` for
  writes (requires active session)
- **Input validation** — Use `check()` for all Meteor method inputs
- **Admin check** — Use `requireAdmin()` in admin-only methods
- **DR Key** — Sensitive persistent data encrypted with PBKDF2-derived key
- **E2E selectors** — All interactive elements must have `data-e2e` attributes. Convention: `data-e2e="<context>-<type>-<identifier>"` (e.g., `login-input-username`, `users-btn-new`). Types: `input`, `btn`, `link`, `select`, `toggle`, `checkbox`, `modal`, `search`, `card`

## Project Structure

```
app/
├── auth/            # Login, credential store, DR key store
├── components/      # Button, DataTable, StatCard, ConfirmModal, ThemeToggle...
├── dashboard/       # Admin dashboard
├── domain/          # Domain info page
├── dr/              # Disaster recovery (sync, backup, restore)
├── general/         # Routing, App shell, 404
├── groups/          # Group management
├── infra/           # Cron jobs, migrations
├── layouts/         # AdminLayout, SelfServiceLayout, AdminGuard...
├── samba/           # Server-only: sambaAuth, sambaUsers, sambaGroups, sambaLdap, sambaExec, sambaConfig
├── oauth/           # OAuth2 server (clients, realms, admin pages)
├── ous/             # Organizational Units management
├── selfservice/     # Self-service portal (profile, change password)
├── serviceaccounts/ # gMSA management
├── settings/        # Admin settings (editable fields, sync account)
├── status/          # Server status
└── users/           # User management

server/
├── main.js          # Server entry point (all method imports)
├── oauth2.js        # OAuth2 server setup (leaonline:oauth2-server)
├── rest.js          # REST API endpoints
├── health.js        # Server health
└── metrics.js       # Prometheus metrics
```

## Theming

Uses CSS custom properties via Tailwind CSS 4 `@theme`. Three themes: Wine (default), Classic, Light.

**Semantic tokens** (use these, NOT raw colors):

- `bg-surface`, `bg-surface-card`, `bg-surface-input`, `bg-surface-hover`
- `text-fg`, `text-fg-secondary`, `text-fg-muted`
- `border-border`, `border-border-subtle`
- `bg-accent`, `hover:bg-accent-hover`, `text-accent`

Themes switch by adding class to `<html>`: `.wine`, `.classic`, `.light`

## Development

```bash
meteor npm start              # Start dev server (port 4080)
meteor npm run quave-check    # ESLint + Prettier
meteor npm install [package]  # Always prefix with meteor
```

## Routes

| Route                     | Area                     | Access             |
|---------------------------|--------------------------|--------------------|
| `/login`                  | Auth                     | Anonymous only     |
| `/`                       | Self-Service             | Any logged user    |
| `/profile`                | Self-Service             | Any logged user    |
| `/change-password`        | Self-Service             | Any logged user    |
| `/admin`                  | Admin — Dashboard        | Domain Admins only |
| `/admin/users`            | Admin — AD               | Domain Admins only |
| `/admin/groups`           | Admin — AD               | Domain Admins only |
| `/admin/ous`              | Admin — AD               | Domain Admins only |
| `/admin/computers`        | Admin — AD               | Domain Admins only |
| `/admin/service-accounts` | Admin — AD               | Domain Admins only |
| `/admin/dns`              | Admin — AD               | Domain Admins only |
| `/admin/gpos`             | Admin — AD               | Domain Admins only |
| `/admin/domain`           | Admin — AD               | Domain Admins only |
| `/admin/oauth/clients`    | Admin — OAuth            | Domain Admins only |
| `/admin/oauth/realms`     | Admin — OAuth            | Domain Admins only |
| `/admin/settings`         | Admin — System           | Domain Admins only |
| `/admin/dr`               | Admin — System           | Domain Admins only |
| `/oauth/authorize`        | OAuth2 (server-rendered) | Public             |
| `/oauth/token`            | OAuth2 API               | Client credentials |
| `/oauth/userinfo`         | OAuth2 API               | Bearer token       |
