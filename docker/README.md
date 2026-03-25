# Docker - Samba Conductor

Docker images for the Samba Conductor infrastructure. All images use **Fedora minimal** as base for the smallest possible footprint.

## Quick Start

```bash
cd docker
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

> **Warning:** These are development-only credentials. Change them in `docker-compose.yml` before any non-local use.

## Testing the Connection

After the container is running, verify with:

```bash
# Check LDAP is responding
docker exec samba-ad-dc samba-tool user list

# Test LDAP bind
docker exec samba-ad-dc samba-tool domain info SAMDOM.EXAMPLE.COM
```

## Environment Variables

| Variable             | Default              | Description                   |
|----------------------|----------------------|-------------------------------|
| SAMBA_REALM          | `SAMDOM.EXAMPLE.COM` | Kerberos realm                |
| SAMBA_DOMAIN         | `SAMDOM`             | NetBIOS domain name           |
| SAMBA_ADMIN_PASSWORD | *(required)*         | Domain administrator password |
| SAMBA_DNS_FORWARDER  | `8.8.8.8`            | DNS forwarder                 |
| SAMBA_SERVER_ROLE    | `dc`                 | Samba server role             |

## TLS / LDAPS

The container automatically generates a self-signed TLS certificate on first start. This enables LDAPS (port 636) with strong authentication enforced by default.

- **Certificate location:** `/var/lib/samba/private/tls/` (persisted in `samba-data` volume)
- **Validity:** 10 years
- **SANs:** `dc1.samdom.example.com`, `localhost`, `127.0.0.1`, `172.20.0.10`

**Development:** The web app connects via `ldaps://localhost:636` with `tlsRejectUnauthorized: false` to accept the self-signed cert.

**Production:** Replace the self-signed certificate with a proper CA-signed one by mounting your files into `/var/lib/samba/private/tls/` and set `tlsRejectUnauthorized: true` (or omit it) in the Meteor settings.

## Network

The container runs on a fixed network `172.20.0.0/24` with the DC at `172.20.0.10`.

In development, the web application runs on the host and connects via `ldaps://localhost:636` (Docker port mapping). The internal Docker IP `172.20.0.10` is only reachable from other containers.

## Volumes

| Volume        | Container Path     | Purpose                  |
|---------------|--------------------|--------------------------|
| `samba-data`  | `/var/lib/samba`   | AD database and state    |
| `samba-config`| `/etc/samba`       | Samba configuration      |
| `samba-logs`  | `/var/log/samba`   | Log files                |

To reset the domain completely:

```bash
docker compose down -v
docker compose up -d
```

## Structure

```
docker/
├── docker-compose.yml       # Service orchestration
├── README.md                # This file
├── CLAUDE.md                # AI development instructions
└── samba-ad-dc/
    ├── Dockerfile           # Fedora minimal + Samba 4
    ├── entrypoint.sh        # Domain provisioning and startup
    ├── supervisord.conf     # Process management
    └── .dockerignore
```
