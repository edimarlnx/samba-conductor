# Troubleshooting

Common issues and solutions for Samba Conductor.

## Connection Issues

### "LDAP bind failed: connect ECONNREFUSED"

- Samba container is not running: `docker ps | grep samba`
- Wrong LDAP URL in settings: check `ldapUrl` in `settings.json`
- Port not mapped: verify `docker compose` port mappings

### "LDAP bind failed: Invalid Credentials"

- Wrong username or password
- User account may be disabled — check in Admin > Users
- Password may have expired — user should try the self-service portal

### "Strong Auth Required"

- LDAP without TLS is blocked. Use LDAPS (port 636) instead of LDAP (port 389)
- Check `ldapUrl` starts with `ldaps://`

### "samba-tool error: spawn /usr/bin/samba-tool ENOENT"

- `samba-tool` is not installed on the host (expected in dev mode)
- Set `"dockerContainer": "samba-ad-dc"` in `settings.json` to run via Docker

## Authentication Issues

### "session-expired" errors on every action

- Session credentials have expired (default: 30 minutes)
- Log out and log in again
- For read operations, configure the Sync Account to enable fallback

### Admin can see data but can't make changes

- Write operations require an active session (no fallback)
- Log out and log in again to refresh credentials

### User with expired password can't log in

- The system detects `pwdLastSet=0` and redirects to password change
- If this doesn't work, the admin can reset the password in Admin > Users

## Domain Issues

### Domain provisioning fails on container start

- Check logs: `docker logs samba-ad-dc`
- Ensure `SAMBA_ADMIN_PASSWORD` is set and meets complexity requirements
- Password must have: uppercase, lowercase, number or special character, minimum 7 chars

### "Domain function level" stuck at 2008 R2

- New domains are provisioned at 2016 level automatically
- For existing domains, use `samba-tool domain level raise`

## Disaster Recovery

### DR Key locked after restart

- Enter the DR key in Admin > Disaster Recovery
- Or set `DR_KEY` environment variable for auto-unlock

### Sync account not working after domain reset

- Click "Reset Password" in Admin > Settings > Sync Account
- If the user doesn't exist, it will be recreated automatically

### S3 backup fails

- Verify S3 credentials in Admin > Disaster Recovery > S3 Backup
- Click "Test & Save" to verify the connection
- Ensure DR Key is unlocked (required for encrypting the S3 secret key)

## Performance

### LDAP queries are slow

- Ensure proper indexes exist on frequently searched attributes
- Reduce sync frequency if not needed
- Check MongoDB disk usage if snapshots are large

### High memory usage

- Samba AD DC typically uses 500MB-1GB
- MongoDB adds 200-500MB
- Consider separating services for larger deployments
