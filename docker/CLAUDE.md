# Docker - Samba Conductor

## Overview

Docker images for the Samba Conductor infrastructure. Three variants, all using a single `/data` volume.

## Images

| Image                      | Base                   | Contents                      |
|----------------------------|------------------------|-------------------------------|
| **samba-ad-dc**            | Fedora minimal         | Samba 4 AD DC only            |
| **web** (`web/Dockerfile`) | zcloud runtime         | Meteor + MongoDB + samba-tool |
| **all-in-one**             | zcloud runtime + Samba | Everything in one container   |

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
│   ├── Dockerfile              # zcloud runtime + Samba + Meteor app
│   ├── docker-compose.yml
│   ├── entrypoint.sh           # Sources samba-setup.sh + mongo/app env
│   └── supervisord.conf
├── README.md
└── CLAUDE.md
```

## Conventions

- Base image: Fedora minimal (samba-ad-dc) or zcloud runtime (web, all-in-one)
- Use `microdnf` on Fedora, `apt-get` on Ubuntu (zcloud)
- Always clean package caches after install
- Single `/data` volume — standard paths symlinked into it
- Sensitive values via environment variables — never hardcoded
- Samba provisioned at Windows Server 2016 functional level
- Self-signed TLS certificate auto-generated on first start
- Shared scripts in `scripts/samba-setup.sh` used by both samba-ad-dc and all-in-one
