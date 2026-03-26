# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Samba Conductor, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please send an email to the maintainers with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will acknowledge receipt within 48 hours and aim to provide a fix within 7 days for critical issues.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Security Design

Samba Conductor follows these security principles:

- **No stored admin credentials** — User credentials are encrypted per-session in server memory (AES-256-GCM) with
  a 30-minute TTL
- **RBAC** — Domain Admins group controls admin access; all others get self-service only
- **DR Key encryption** — Backup data encrypted with PBKDF2-derived key; key is never stored
- **Server-side only** — All AD operations (LDAP, samba-tool) execute server-side only
- **Input validation** — All Meteor method inputs validated with `check()`
- **TLS** — LDAPS with auto-generated or user-provided certificates
- **Sync account** — Auto-generated password, encrypted with DR Key, admin never sees it

## Dependencies

We regularly update dependencies. If you notice an outdated dependency with known vulnerabilities, please open an
issue.
