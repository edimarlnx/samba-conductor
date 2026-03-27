# Docker - Samba Conductor

## Overview

Docker images for the Samba Conductor infrastructure. Three variants, all using a single `/data` volume.

## Images

| Image                      | Base                                         | Contents                              |
|----------------------------|----------------------------------------------|---------------------------------------|
| **samba-ad-dc**            | Fedora minimal                               | Samba 4 AD DC only                    |
| **web** (`web/Dockerfile`) | zcloud runtime                               | Meteor + MongoDB + samba-tool         |
| **all-in-one**             | Fedora minimal + Node.js/MongoDB from Meteor | Samba + Meteor + MongoDB + Supervisor |

## Structure

```
docker/
├── docker-compose.yml          # Dev: standalone Samba DC
├── scripts/
│   └── samba-setup.sh          # Shared provisioning/TLS/kerberos
├── samba-ad-dc/
│   ├── Dockerfile              # Fedora minimal + Samba 4
│   ├── entrypoint.sh           # Sources samba-setup.sh
│   └── supervisord.conf
├── all-in-one/
│   ├── Dockerfile              # Fedora minimal + Samba + Node.js + MongoDB + Meteor app
│   ├── docker-compose.yml
│   ├── entrypoint.sh           # Sources samba-setup.sh, assembles supervisor config
│   └── supervisor/             # Supervisor config templates
│       ├── supervisord.conf    # Base config with [include]
│       ├── samba.conf          # Always active
│       ├── mongodb.conf        # Active when internal MongoDB needed
│       └── webapp.conf         # Active when ROOT_URL is set
├── README.md
└── CLAUDE.md
```

## Conventions

- Base image: Fedora minimal (samba-ad-dc, all-in-one) or zcloud runtime (web)
- Use `microdnf` on Fedora, `apt-get` on Ubuntu (zcloud)
- Always clean package caches after install
- Single `/data` volume — standard paths symlinked into it
- Sensitive values via environment variables — never hardcoded
- Samba provisioned at Windows Server 2016 functional level
- Self-signed TLS certificate auto-generated per DC on first start
- Shared scripts in `scripts/samba-setup.sh` used by both samba-ad-dc and all-in-one
- Replica DC support via `SAMBA_JOIN_AS_DC=true` + `SAMBA_PRIMARY_DC=hostname`
- Dev compose includes replica as optional profile (`--profile replica`)

## All-in-One Service Management

Entrypoint conditionally assembles supervisor config from templates based on environment:

| `ROOT_URL` | `MONGO_URL` | Services started                  |
|------------|-------------|-----------------------------------|
| not set    | —           | Samba only                        |
| set        | not set     | Samba + internal MongoDB + webapp |
| set        | set         | Samba + webapp (external MongoDB) |

If `METEOR_SETTINGS` env var is provided, it is used as-is. Otherwise, settings are generated from `SAMBA_REALM`.
