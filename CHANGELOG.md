# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Web UI for Samba 4 AD DC management (Meteor 3.4 + React 19 + Tailwind CSS 4)
- Self-service portal for users (profile editing, password change)
- Admin panel with RBAC (Domain Admins only)
- User management (CRUD, enable/disable, move to OU, group membership)
- Group management (CRUD, members, move to OU)
- Organizational Units (tree view, create, rename, delete, move)
- Computer account management
- Service Accounts (gMSA) management
- DNS zone and record management
- Group Policy Object (GPO) management
- Domain information and functional levels
- OAuth2 Authorization Server (leaonline:oauth2-server) with LDAP-backed authentication
- OAuth2 client management (create, edit, reset secret, delete)
- OAuth2 realm system (logical grouping, AD group restrictions, per-realm scopes)
- OAuth2 endpoints (/oauth/authorize, /oauth/token, /oauth/userinfo)
- Admin sidebar organized by sections (Active Directory, OAuth Server, System)
- Per-session encrypted credentials (AES-256-GCM, 30min TTL)
- Sync account with auto-generated password
- Disaster Recovery system (DR Key, AD sync, password hash backup)
- S3-compatible backup (mongodump + samba domain backup)
- Restore from MongoDB snapshots
- Password expiry detection and forced change
- Mobile-first responsive design
- Theme system (Wine dark, Classic dark, Light)
- Docker images (standalone DC, web app, all-in-one)
- DC replication support via environment variables
- Windows Server 2016 functional level
- LDAPS with auto-generated TLS certificates
- Documentation (admin, user, infrastructure guides)
- Playwright-based screenshot automation for docs
