# Getting Started

This guide walks you through the initial setup of Samba Conductor.

## First Run

### 1. Start the Services

**Development (Samba + Meteor separately):**

```bash
# Start Samba DC (primary only)
cd docker
docker compose up -d

# Or with replica DC
docker compose --profile replica up -d

# Start the web app
cd web
meteor npm install
meteor npm start
```

**All-in-one (single container):**

```bash
cd docker/all-in-one
docker compose up -d
```

### 2. First Login

Open the web UI:

- Development: `http://localhost:4080`
- All-in-one: `http://localhost:3000`

Login with the default admin credentials:

- **Username:** `Administrator`
- **Password:** `P@ssw0rd123!`

> Change these credentials immediately in production.

### 3. Initial Setup Checklist

After first login, you'll see warnings on the Dashboard. Complete these steps:

#### Configure the DR Key

1. Go to **Admin** > **Disaster Recovery**
2. Click **Generate a key** or provide your own
3. **Save the key securely** — it cannot be recovered
4. This key encrypts all backup data

#### Configure the Sync Account

1. Go to **Admin** > **Settings** > **Sync Account**
2. Set a username (default: `svc-conductor`)
3. Click **Create & Configure**
4. A strong password is generated automatically and stored encrypted

#### Configure Self-Service Fields

1. Go to **Admin** > **Settings** > **Self-Service Editable Fields**
2. Toggle which fields users can edit in the self-service portal
3. By default, email is disabled (read-only for users)

## Architecture Overview

Samba Conductor has two areas:

| Area             | URL      | Who           | Purpose                                    |
|------------------|----------|---------------|--------------------------------------------|
| **Self-Service** | `/`      | All AD users  | View profile, edit fields, change password |
| **Admin**        | `/admin` | Domain Admins | Full AD management                         |

## Next Steps

- [Create your first OU](organizational-units.md) to organize users
- [Create users](user-management.md) for your organization
- [Join machines](../infra/join-windows.md) to the domain
- [Set up backup](disaster-recovery.md) to protect your data
