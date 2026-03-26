<p align="center">
  <img src="images/logo-dark.png" alt="Samba Conductor" width="200">
</p>

# Samba Conductor Documentation

Welcome to the Samba Conductor documentation. These guides cover setup, administration, and usage of the Samba 4
Active Directory Domain Controller managed by Samba Conductor.

## For Administrators

- [Getting Started](admin/getting-started.md) — Initial setup and first login
- [User Management](admin/user-management.md) — Creating, editing, and managing AD users
- [Group Management](admin/group-management.md) — Groups, memberships, and organizational structure
- [Organizational Units](admin/organizational-units.md) — OU hierarchy and object organization
- [Computer Management](admin/computer-management.md) — Domain-joining Windows and Linux machines
- [DNS Management](admin/dns-management.md) — Zones, records, and name resolution
- [Group Policy (GPO)](admin/gpo-management.md) — Creating and linking Group Policy Objects
- [Domain Info](admin/domain-info.md) — Domain configuration, functional levels, DC status
- [Service Accounts](admin/service-accounts.md) — Group Managed Service Accounts (gMSA)
- [Disaster Recovery](admin/disaster-recovery.md) — Backup, sync, restore, and DR key management
- [Security](admin/security.md) — Authentication, session management, and best practices
- [Settings](admin/settings.md) — Self-service configuration and sync account
- [OAuth Clients](admin/oauth-clients.md) — Registering and managing OAuth2 client applications
- [OAuth Realms](admin/oauth-realms.md) — Logical grouping and access control for OAuth clients

## For Users

- [Self-Service Portal](user/self-service.md) — Accessing your account, editing profile, and changing password
- [Password Policy](user/password-policy.md) — Password requirements and expiration

## Infrastructure

- [Docker Deployment](infra/docker-deployment.md) — Running with Docker (standalone, web, all-in-one)
- [Joining Windows to the Domain](infra/join-windows.md) — Step-by-step guide for Windows machines
- [Joining Linux to the Domain](infra/join-linux.md) — Step-by-step guide for Linux machines (SSSD/Winbind)
- [LDAP Integration](infra/ldap-integration.md) — Connecting applications to Samba via LDAP/LDAPS
- [OAuth2 Integration](infra/oauth-integration.md) — Connecting apps via OAuth2 (Grafana, Portainer, GitLab)
- [DC Replication](infra/dc-replication.md) — Setting up a second DC for high availability
- [Troubleshooting](infra/troubleshooting.md) — Common issues and solutions

## Examples

- [Grafana + OAuth2](examples/docker-compose.grafana.yml) — Docker Compose to test OAuth2 login with Grafana
