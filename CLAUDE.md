# Samba Conductor

## Overview
All-in-one orchestration suite providing a modern Web UI for **Samba 4 Active Directory Domain Controller (AD DC)**. Open-source (MIT License).

## Project Structure
```
samba-conductor/
├── web/              # Meteor JS application (Web UI)
├── docker/           # Docker images (Samba 4 on Fedora minimal)
└── CLAUDE.md         # This file (root project instructions)
```

Each subdirectory has its own `CLAUDE.md` with specific instructions.

## Core Features
- **Directory Management:** CRUD for Users, Groups, and OUs
- **Identity Provider:** OAuth2 support for third-party auth against Samba/LDAP backend
- **Real-time Monitoring:** Dashboard for service status, logs, replication health
- **Access Control:** Web-based domain permissions and policies management

## Technical Overview
- **Web UI:** Meteor JS + Tailwind CSS + MongoDB
- **Primary Data Source:** Samba 4 (LDAP/Active Directory)
- **Integration:** `ldapjs`/`activedirectory2`, `samba-tool`, OAuth2
- **Deployment:** Docker containers (Fedora minimal base)

## Development Constraints
- All admin actions must be server-side — no sensitive credentials on client
- Keep Samba/LDAP logic separate from UI components (modularity)
- Code comments in English
