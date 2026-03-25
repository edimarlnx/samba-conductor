# Samba Conductor - Web UI

Modern web interface for managing Samba 4 Active Directory Domain Controller. Built with Meteor 3, React 19, and Tailwind CSS 4.

## Prerequisites

- **Linux** (required — the app uses `docker exec` and `samba-tool` which are Linux-only)
- **Node.js 20+**
- **Meteor 3.3+**
- **Docker** with the Samba container running (see [Docker setup](../docker/README.md))

### How it works

In development, the Meteor app runs on the host machine while Samba runs inside a Docker container. The app communicates with Samba in two ways:

- **LDAP/LDAPS** — direct connection to `ldaps://localhost:636` for authentication and queries
- **samba-tool** — executed inside the container via `docker exec samba-ad-dc samba-tool ...` for AD management operations (user/group CRUD)

This is controlled by `"dockerContainer": "samba-ad-dc"` in `settings.json`. In production, when the app runs alongside Samba (same host or container), remove this setting so `samba-tool` runs locally.

## Getting Started

### 1. Start the Samba container

```bash
cd ../docker
docker compose up -d
```

See the [Docker README](../docker/README.md) for default credentials and details.

### 2. Install dependencies and start

```bash
cd web
meteor npm install
meteor npm start
```

### 3. Login

Open `http://localhost:3000/login` and sign in with the AD administrator credentials:

- **Username:** `Administrator`
- **Password:** `P@ssw0rd123!`

> These are the default development credentials from `docker-compose.yml`. See [Docker README](../docker/README.md) for details.

## Features

- **Dashboard** — Domain overview with user/group counts and quick actions
- **User Management** — Create, edit, enable/disable, and delete AD users
- **Group Management** — Create, delete groups and manage members
- **LDAP Authentication** — Login against Samba AD via LDAP bind

## Tech Stack

- **Framework:** Meteor 3 (real-time reactivity via DDP)
- **Frontend:** React 19 with React Compiler
- **Styling:** Tailwind CSS 4 (dark theme)
- **Database:** MongoDB (Meteor sessions only — AD data is fetched on-demand)
- **Samba Integration:** `ldapjs` for LDAP operations, `samba-tool` for AD commands

## Project Structure

```
app/
├── auth/           # Login page and LDAP authentication handler
├── components/     # Reusable UI (Button, DataTable, StatCard, ConfirmModal...)
├── dashboard/      # Dashboard page and server methods
├── general/        # Routing, App shell, 404
├── groups/         # Group management (list, create, edit)
├── infra/          # Cron jobs and migrations
├── layouts/        # AdminLayout (sidebar), ConditionalLayout, etc.
├── samba/          # Server-only Samba service layer (LDAP, samba-tool)
├── status/         # Server status page
└── users/          # User management (list, create, edit)

server/
├── main.js         # Server entry point
├── rest.js         # REST API endpoints
├── health.js       # Server health monitoring
└── metrics.js      # Prometheus metrics
```

## Configuration

App settings are in `private/env/dev/settings.json`:

```json
{
  "public": {
    "appInfo": { "name": "Samba Conductor" }
  },
  "samba": {
    "ldapUrl": "ldap://172.20.0.10:389",
    "baseDn": "DC=samdom,DC=example,DC=com",
    "realm": "SAMDOM.EXAMPLE.COM"
  }
}
```

## Development Commands

```bash
meteor npm start              # Start dev server
meteor npm run quave-check    # ESLint + Prettier
```

## License

MIT
