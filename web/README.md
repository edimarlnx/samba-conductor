# Samba Conductor - Web UI

Modern web interface for managing Samba 4 Active Directory Domain Controller. Built with Meteor 3.4, React 19, and
Tailwind CSS 4.

## Prerequisites

- **Linux** (required — uses `docker exec` and `samba-tool`)
- **Node.js 20+**
- **Meteor 3.4+**
- **Docker** with the Samba container running (see [Docker setup](../docker/README.md))

### How it works

In development, the Meteor app runs on the host while Samba runs in a Docker container:

- **LDAPS** — `ldaps://localhost:636` for authentication and LDAP queries
- **samba-tool** — via `docker exec samba-ad-dc samba-tool ...` for AD management

Controlled by `"dockerContainer": "samba-ad-dc"` in `settings.json`. In production (same host/container as Samba),
remove this setting.

## Getting Started

### 1. Start the Samba container

```bash
cd ../docker
docker compose up -d

# Optional: start with replica DC
docker compose --profile replica up -d
```

See [Docker README](../docker/README.md) for default credentials and replication setup.

### 2. Initialize submodules and install dependencies

```bash
# From the project root — fetch the OAuth2 server package (git submodule)
git submodule update --init --recursive

# Install and start
cd web
meteor npm install
meteor npm start
```

### 3. Login

Open `http://localhost:4080/login`:

- **Username:** `Administrator`
- **Password:** `P@ssw0rd123!`

> Default dev credentials. See [Docker README](../docker/README.md).

## Features

### Self-Service Portal (`/`)

- View own profile and group memberships
- Edit profile fields (configurable by admin)
- Change password (including expired passwords)

### Admin Panel (`/admin`)

- **Dashboard** — Domain overview with stats and warnings
- **User Management** — Full CRUD with all AD attributes, group membership
- **Group Management** — Create/delete groups, manage members
- **Domain Info** — Realm, DC, functional levels (Windows Server 2016)
- **Settings** — Self-service editable fields config, sync account
- **Disaster Recovery** — DR Key, AD sync, S3 backup, restore from snapshot

### Security

- **No stored admin passwords** — Credentials encrypted per-session in server memory (AES-256-GCM, 30min TTL)
- **Read fallback** — If session expires, read operations fall back to sync account
- **Write requires session** — Write operations require re-authentication
- **DR Key** — Backup data encrypted with PBKDF2-derived key (admin sets passphrase)
- **RBAC** — `Domain Admins` = admin panel, all others = self-service only

## Tech Stack

- **Framework:** Meteor 3.4 (async/await, no Fibers)
- **Frontend:** React 19 with React Compiler
- **Styling:** Tailwind CSS 4 — mobile-first, 3 themes (Wine, Classic, Light)
- **Database:** MongoDB (app state only — AD data fetched on-demand)
- **Samba:** `ldapjs` for LDAPS, `samba-tool` via `child_process.execFile`
- **Backup:** `@aws-sdk/client-s3` for S3-compatible storage

## Project Structure

```
app/
├── auth/            # Login, credential store, DR key store
├── components/      # Button, DataTable, StatCard, ThemeToggle...
├── dashboard/       # Admin dashboard
├── domain/          # Domain info
├── dr/              # Disaster recovery (sync, backup, restore)
├── general/         # Routing, App shell
├── groups/          # Group management
├── infra/           # Cron jobs, migrations
├── layouts/         # AdminLayout (responsive sidebar), SelfServiceLayout
├── samba/           # Server-only: LDAP, samba-tool, auth, config
├── selfservice/     # Profile, change password
├── settings/        # Admin settings, sync account
└── users/           # User management
```

## Configuration

`private/env/dev/settings.json`:

```json
{
  "public": {
    "appInfo": { "name": "Samba Conductor" }
  },
  "samba": {
    "ldapUrl": "ldaps://localhost:636",
    "baseDn": "DC=samdom,DC=example,DC=com",
    "realm": "SAMDOM.EXAMPLE.COM",
    "tlsRejectUnauthorized": false,
    "dockerContainer": "samba-ad-dc",
    "sessionTtlMinutes": 30
  }
}
```

## Development Commands

```bash
meteor npm start              # Start dev server (port 4080)
meteor npm run quave-check    # ESLint + Prettier
```

## License

MIT
