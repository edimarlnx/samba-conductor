# Docker - Samba Conductor

Three Docker image variants, all using a **single `/data` volume** for persistence. Built-in support for DC
replication via environment variables.

## Images

| Image | Base | Contents | Use case |
|---|---|---|---|
| **samba-ad-dc** | Fedora minimal | Samba 4 AD DC only | Standalone DC + web app on host or separate container |
| **web** (`web/Dockerfile`) | zcloud runtime | Meteor + MongoDB + samba-tool | Web UI connecting to external Samba DC |
| **all-in-one** | zcloud runtime + Samba | Everything in one container | Single-box deployment |

## Quick Start (Development)

```bash
# Primary DC only (use with "meteor npm start" on host)
cd docker
docker compose up -d

# Primary + Replica DC
docker compose --profile replica up -d

# All-in-one (everything in one container)
cd docker/all-in-one
docker compose up -d
```

The first start provisions the AD domain automatically (Windows Server 2016 functional level).

## Default Credentials

| Field    | Value                |
|----------|----------------------|
| Username | `Administrator`      |
| Password | `P@ssw0rd123!`       |
| Realm    | `SAMDOM.EXAMPLE.COM` |
| Domain   | `SAMDOM`             |

> **Warning:** These are development-only credentials. Change them before any non-local use.

## Environment Variables

### Primary DC

| Variable             | Default              | Description                   |
|----------------------|----------------------|-------------------------------|
| SAMBA_REALM          | `SAMDOM.EXAMPLE.COM` | Kerberos realm                |
| SAMBA_DOMAIN         | `SAMDOM`             | NetBIOS domain name           |
| SAMBA_ADMIN_PASSWORD | *(required)*         | Domain administrator password |
| SAMBA_DNS_FORWARDER  | `8.8.8.8`            | DNS forwarder                 |
| SAMBA_SERVER_ROLE    | `dc`                 | Samba server role             |

### Replica DC (additional)

| Variable         | Required | Description                                             |
|------------------|----------|---------------------------------------------------------|
| SAMBA_JOIN_AS_DC | Yes      | Set to `true` to join as replica instead of provision   |
| SAMBA_PRIMARY_DC | Yes      | FQDN of the primary DC (e.g., `dc1.samdom.example.com`) |
| SAMBA_SITE       | No       | AD site name for multi-site topology                    |

### All-in-one (additional)

| Variable | Default                 | Description |
|----------|-------------------------|-------------|
| ROOT_URL | `http://localhost:3000` | Web UI URL  |
| PORT     | `3000`                  | Web UI port |

## Replication

The dev `docker-compose.yml` includes a replica DC as an optional profile:

```bash
# Start primary only
docker compose up -d

# Start primary + replica
docker compose --profile replica up -d

# Verify replication
docker exec samba-ad-dc samba-tool drs showrepl

# Test: create user on primary, check on replica
docker exec samba-ad-dc samba-tool user create testuser Pass123! -U Administrator%'P@ssw0rd123!'
docker exec samba-dc2 samba-tool user list
```

The replica container automatically:

1. Points DNS to the primary DC
2. Configures Kerberos for the domain
3. Runs `samba-tool domain join DC`
4. Generates its own TLS certificate
5. Starts Samba as a replica

See [DC Replication Guide](../docs/infra/dc-replication.md) for production setup.

## Network

```
172.20.0.0/24
├── 172.20.0.10  — DC1 (primary)
└── 172.20.0.11  — DC2 (replica, optional)
```

Host port mappings:

| Service  | DC1 (primary) | DC2 (replica) |
|----------|---------------|---------------|
| DNS      | 53            | 5353          |
| Kerberos | 88            | 8888          |
| LDAP     | 389           | 3389          |
| SMB      | 445           | 4445          |
| LDAPS    | 636           | 6636          |
| GC       | 3268          | 32680         |

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

Self-signed TLS certificate is auto-generated per DC on first start.

- **Location:** `/data/samba/private/tls/`
- **Validity:** 10 years
- **SANs:** `<hostname>.samdom.example.com`, `localhost`, `127.0.0.1`

**Production:** Mount CA-signed certs into `/data/samba/private/tls/` (cert.pem, key.pem, ca.pem).

## Shared Scripts

`scripts/samba-setup.sh` is used by both `samba-ad-dc` and `all-in-one` images. It handles:

- Directory setup and symlinks to `/data`
- Domain provisioning (primary) or domain join (replica)
- Kerberos configuration
- TLS certificate generation

## Structure

```
docker/
├── docker-compose.yml          # Dev: primary + replica (profile)
├── scripts/
│   └── samba-setup.sh          # Shared provisioning/join/TLS/kerberos
├── samba-ad-dc/
│   ├── Dockerfile              # Fedora minimal + Samba 4
│   ├── entrypoint.sh           # Sources samba-setup.sh
│   └── supervisord.conf
├── all-in-one/
│   ├── Dockerfile              # zcloud runtime + Samba + Meteor app
│   ├── docker-compose.yml      # Build and run all-in-one
│   ├── entrypoint.sh           # Sources samba-setup.sh + mongo/app env
│   └── supervisord.conf
├── README.md
└── CLAUDE.md
```
