# Security Overview

This document describes the security architecture of Samba Conductor. It is intended for administrators who need to
understand how credentials, sessions, and encryption are handled.

## Authentication Model

Samba Conductor authenticates users by performing an **LDAP bind** against the Samba Active Directory domain controller
using the credentials provided at login. No passwords are stored in any database.

- When a user logs in, their username and password are validated directly against AD via LDAP bind.
- If the bind succeeds, the credentials are encrypted and held in server memory for the duration of the session (see
  below).
- There is no local user database or password file.

## Session Credential Management

After a successful LDAP bind, the user's credentials are encrypted in server memory so that subsequent AD operations can
be performed on their behalf.

### Encryption

- **Algorithm:** AES-256-GCM (authenticated encryption).
- **Key source:** The `CREDENTIAL_ENCRYPTION_KEY` environment variable (hex-encoded, 32 bytes). If not set, a random key
  is generated at each server boot (more secure for single-instance deployments, but sessions are lost on restart).
- **Per-entry protection:** Each credential entry has its own random 16-byte initialization vector (IV) and
  authentication tag.

### Session TTL

- Sessions expire after **30 minutes** by default.
- The TTL is configurable via `Meteor.settings.samba.sessionTtlMinutes`.
- Expired entries are automatically purged from memory every 60 seconds.
- When a session expires, the user must log in again to perform write operations.

### Read vs. Write Credential Separation

- **Write operations** (creating users, resetting passwords, modifying groups) always require an active, non-expired
  user session. There is no fallback.
- **Read operations** (listing users, viewing groups) first attempt to use the user's session credentials. If the
  session has expired, they fall back to the **sync service account** (if configured in Settings). This allows read-only
  browsing to continue seamlessly.

## Role-Based Access Control (RBAC)

Access is determined by Active Directory group membership:

| Role              | Access Level                                                                                                              |
|-------------------|---------------------------------------------------------------------------------------------------------------------------|
| **Domain Admins** | Full access to all admin pages (`/admin/*`), including user/group management, DNS, GPOs, settings, and disaster recovery. |
| **Regular users** | Access to the self-service portal only: view profile, edit allowed fields, change password.                               |

Admin routes are protected by a server-side guard that verifies Domain Admins membership on every request. There is no
client-side-only access check.

## DR Key Encryption

The Disaster Recovery Key protects sensitive data stored in MongoDB (password hashes, sync account credentials, backup
metadata).

### Key Derivation

- **Algorithm:** PBKDF2 with SHA-512.
- **Iterations:** 100,000.
- **Output:** 256-bit derived key.
- A random 32-byte **salt** is generated when the DR Key is first configured and stored in MongoDB alongside a
  verification hash.

### Key Storage

- The DR Key itself is **never stored** in any database. Only the salt and a verification HMAC-SHA256 hash are
  persisted.
- The derived encryption key is held **in server memory only**. It is lost on server restart and must be re-entered (or
  auto-loaded from the `DR_KEY` environment variable).

### Data Encryption

- All DR-protected data is encrypted with **AES-256-GCM** using the PBKDF2-derived key.
- Each encrypted record has its own random IV and authentication tag.

## Best Practices

1. **Set `CREDENTIAL_ENCRYPTION_KEY`** in production. Without it, a random key is generated per boot, meaning all active
   sessions are invalidated on restart. Use a 32-byte hex string (64 characters).

2. **Set `DR_KEY`** as an environment variable for unattended restarts. Without it, an administrator must manually
   unlock the DR Key after every server restart before backups and hash syncs can resume.

3. **Configure the sync account** (Settings page) to ensure read-only operations remain available even after user
   sessions expire.

4. **Use HTTPS** for all connections to the Samba Conductor web interface. Credentials are transmitted during login and
   must be protected in transit.

5. **Restrict access** to the Docker host and environment variables. Anyone with access to `CREDENTIAL_ENCRYPTION_KEY`
   or `DR_KEY` environment values could decrypt session or backup data.

6. **Rotate the sync account password** periodically using the Reset Password button in Settings.

7. **Back up the DR Key** to a secure offline location. If lost, all encrypted backup data (password hashes, sync
   credentials) becomes permanently inaccessible.
