<p align="center">
  <img src="media/logo-dark.png" alt="Samba Conductor" width="400">
</p>

<p align="center">
  <strong>Modern Web UI for Samba 4 Active Directory Domain Controller</strong>
</p>

<p align="center">
  <a href="docs/README.md">Documentation</a> &bull;
  <a href="docs/admin/getting-started.md">Getting Started</a> &bull;
  <a href="docs/infra/docker-deployment.md">Docker Deployment</a>
</p>

---

Samba Conductor is an open-source orchestration suite that provides a modern, responsive web interface for managing
Samba 4 Active Directory. It simplifies AD administration through a clean UI with enterprise-grade security.

## Features

- **User Management** - Create, edit, enable/disable AD users with full attribute support
- **Group Management** - Groups, memberships, and organizational structure
- **Organizational Units** - Hierarchical OU tree with drag-and-drop organization
- **Computer Accounts** - Domain-joined machine management
- **DNS Management** - Zones and records management
- **Group Policy (GPO)** - Create, link, and manage Group Policy Objects
- **Service Accounts** - Group Managed Service Accounts (gMSA)
- **Self-Service Portal** - Users can change passwords and edit their profiles
- **Disaster Recovery** - Encrypted AD backups to S3-compatible storage
- **Mobile-First** - Responsive design with dark wine theme and theme switching

## Tech Stack

- **Backend**: Meteor 3.4 + MongoDB
- **Frontend**: React 19 + Tailwind CSS 4
- **AD Integration**: LDAPS + samba-tool
- **Security**: Per-session encrypted credentials, RBAC, DR key encryption
- **Deployment**: Docker (standalone DC, web app, or all-in-one)

## Quick Start

```bash
# Start the Samba DC
cd docker
docker compose up -d

# Start the web app
cd web
meteor npm install
meteor npm start
```

Open `http://localhost:4080` and login with `Administrator` / `P@ssw0rd123!`.

See [Getting Started](docs/admin/getting-started.md) for the full setup guide.

## Documentation

Full documentation is available in the [docs/](docs/README.md) directory:

- [Getting Started](docs/admin/getting-started.md)
- [Docker Deployment](docs/infra/docker-deployment.md)
- [DC Replication](docs/infra/dc-replication.md)
- [Joining Windows](docs/infra/join-windows.md) / [Linux](docs/infra/join-linux.md) machines
- [LDAP Integration](docs/infra/ldap-integration.md)
- [Self-Service Portal](docs/user/self-service.md)

## License

MIT
