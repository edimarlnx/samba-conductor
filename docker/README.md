# Docker - Samba Conductor

Three Docker image variants, all using a **single `/data` volume** for persistence.

## Images

| Image | Base | Contents | Use case |
|---|---|---|---|
| **samba-ad-dc** | Fedora minimal | Samba 4 AD DC only | Standalone DC + web app on host or separate container |
| **web** (`web/Dockerfile`) | zcloud runtime | Meteor + MongoDB + samba-tool | Web UI connecting to external Samba DC |
| **all-in-one** | zcloud runtime + Samba | Everything in one container | Single-box deployment |

## Quick Start (Development)

```bash
# Standalone Samba DC (use with "meteor npm start" on host)
cd docker
docker compose up -d

# All-in-one (everything in one container)
cd docker/all-in-one
docker compose up -d
```

The first start provisions the AD domain automatically. This may take a minute.

## Default Credentials

| Field    | Value                |
|----------|----------------------|
| Username | `Administrator`      |
| Password | `P@ssw0rd123!`       |
| Realm    | `SAMDOM.EXAMPLE.COM` |
| Domain   | `SAMDOM`             |

> **Warning:** These are development-only credentials. Change them before any non-local use.

## Environment Variables

| Variable             | Default              | Description                   |
|----------------------|----------------------|-------------------------------|
| SAMBA_REALM          | `SAMDOM.EXAMPLE.COM` | Kerberos realm                |
| SAMBA_DOMAIN         | `SAMDOM`             | NetBIOS domain name           |
| SAMBA_ADMIN_PASSWORD | *(required)*         | Domain administrator password |
| SAMBA_DNS_FORWARDER  | `8.8.8.8`            | DNS forwarder                 |
| SAMBA_SERVER_ROLE    | `dc`                 | Samba server role             |
| ROOT_URL             | `http://localhost:3000` | Web UI URL (all-in-one)    |
| PORT                 | `3000`               | Web UI port (all-in-one)      |

## Persistence — Single `/data` Volume

All images use one mount point at `/data`. Standard paths are symlinked into it.

```
/data/
├── samba/          # AD database, private keys, TLS certs
├── samba-config/   # smb.conf
├── mongodb/        # MongoDB data files (all-in-one only)
└── logs/
    ├── samba/
    ├── mongodb/    # (all-in-one only)
    └── app/        # (all-in-one only)
```

To reset everything:

```bash
docker compose down -v
docker compose up -d
```

## TLS / LDAPS

Self-signed TLS certificate is auto-generated on first start.

- **Location:** `/data/samba/private/tls/`
- **Validity:** 10 years
- **SANs:** `dc1.samdom.example.com`, `localhost`, `127.0.0.1`

**Production:** Mount CA-signed certs into `/data/samba/private/tls/` (cert.pem, key.pem, ca.pem).

## Shared Scripts

Samba setup logic is shared between `samba-ad-dc` and `all-in-one` via `scripts/samba-setup.sh`. This handles provisioning, Kerberos config, and TLS setup.

## Structure

```
docker/
├── docker-compose.yml          # Dev: standalone Samba DC
├── scripts/
│   └── samba-setup.sh          # Shared Samba provisioning/TLS/kerberos
├── samba-ad-dc/
│   ├── Dockerfile              # Fedora minimal + Samba 4
│   ├── entrypoint.sh           # Sources samba-setup.sh
│   └── supervisord.conf        # samba only
├── all-in-one/
│   ├── Dockerfile              # zcloud runtime + Samba + Meteor app
│   ├── docker-compose.yml      # Build and run all-in-one
│   ├── entrypoint.sh           # Sources samba-setup.sh + mongo/app env
│   └── supervisord.conf        # samba + mongodb + webapp
├── README.md
└── CLAUDE.md
```
