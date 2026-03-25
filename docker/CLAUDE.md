# Docker - Samba Conductor

## Overview
Docker images for the Samba Conductor infrastructure. All images use **Fedora minimal** as base for the smallest possible footprint.

## Structure
```
docker/
├── docker-compose.yml       # Orchestration for all services
├── samba-ad-dc/             # Samba 4 AD DC image
│   ├── Dockerfile
│   ├── entrypoint.sh        # Provisioning and startup
│   └── supervisord.conf     # Process management
└── CLAUDE.md                # This file
```

## Conventions
- Base image: `registry.fedoraproject.org/fedora-minimal` (latest stable)
- Use `microdnf` instead of `dnf` (fedora-minimal requirement)
- Always run `microdnf clean all` after installs to reduce layer size
- Persistent data via Docker volumes, never baked into images
- Sensitive values (passwords) via environment variables — never hardcoded in Dockerfiles
- Use supervisord for multi-process containers

## Quick Start
```bash
cd docker
docker compose up -d
```

## Environment Variables (samba-ad-dc)
| Variable | Default | Description |
|---|---|---|
| SAMBA_REALM | SAMDOM.EXAMPLE.COM | Kerberos realm |
| SAMBA_DOMAIN | SAMDOM | NetBIOS domain name |
| SAMBA_ADMIN_PASSWORD | *(required)* | Domain administrator password |
| SAMBA_DNS_FORWARDER | 8.8.8.8 | DNS forwarder |
| SAMBA_SERVER_ROLE | dc | Samba server role |
