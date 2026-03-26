# Samba Conductor

## Overview

All-in-one orchestration suite providing a modern Web UI for **Samba 4 Active Directory Domain Controller (AD DC)**.
Open-source (MIT License). Windows Server 2016 functional level.

## Project Structure

```
samba-conductor/
├── web/              # Meteor JS application (Web UI)
├── docker/           # Docker images (samba-ad-dc, all-in-one)
│   ├── scripts/      # Shared samba provisioning scripts
│   ├── samba-ad-dc/  # Standalone Samba DC image
│   └── all-in-one/   # Full stack image (Samba + Web + MongoDB)
├── docs/             # Project documentation for end users
└── CLAUDE.md         # This file
```

Each subdirectory has its own `CLAUDE.md` with specific instructions.

## Core Features

- **Self-Service Portal** (`/`) — Users can view profile, edit allowed fields, change expired passwords
- **Admin Panel** (`/admin/*`) — Domain Admins only: user/group CRUD, domain info, settings, disaster recovery
- **Disaster Recovery** — AD sync to MongoDB, encrypted backups to S3, restore from snapshots
- **Security** — Per-session encrypted credentials (no stored admin passwords), DR Key for backup encryption

## Technical Overview

- **Web UI:** Meteor 3.4 + React 19 + Tailwind CSS 4 (mobile-first, 3 themes: Wine/Classic/Light)
- **Primary Data Source:** Samba 4 AD DC (LDAPS + samba-tool)
- **Database:** MongoDB (app state, settings, DR snapshots — AD data is NOT stored here except for DR)
- **Deployment:** Docker (3 image variants, single `/data` volume)

## Architecture

- **Authentication:** LDAP bind per user, credentials encrypted in server memory with TTL (30min)
- **RBAC:** `Domain Admins` group = admin access, all others = self-service only
- **Credential Store:** AES-256-GCM, random key per boot (session), PBKDF2-derived key (DR data)
- **Sync Account:** Auto-created AD service account for background sync jobs
- **S3 Backup:** Configurable mongodump + samba-tool domain backup → S3-compatible storage

## Development Constraints

- All AD operations must be server-side — no sensitive credentials on client
- Keep Samba/LDAP logic separate from UI components (`app/samba/` is server-only)
- Meteor 3.4: native async/await only — NO Fibers, NO Promise.await
- Code comments in English
- JavaScript only — no TypeScript
- All interactive UI elements (inputs, buttons, links, selects, toggles, checkboxes, modals) must have `data-e2e` attributes for Playwright testing. Convention: `data-e2e="<context>-<type>-<identifier>"` (e.g., `login-input-username`, `users-btn-new`, `admin-sidebar-link-users`)
