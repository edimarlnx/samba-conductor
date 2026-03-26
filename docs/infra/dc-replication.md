# Domain Controller Replication

This guide explains how to set up a second Samba 4 Domain Controller as a replica for high availability and redundancy.

## Why Replicate?

- **High availability** — If one DC goes down, the other continues serving authentication and LDAP
- **Load distribution** — Clients can authenticate against the nearest DC
- **Disaster recovery** — A replica is the fastest way to recover from DC failure
- **Geographic distribution** — Place DCs in different sites/locations

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  DC1 (Primary)  │◄───────►│  DC2 (Replica)  │
│  172.20.0.10    │  Repl.  │  172.20.0.11    │
│  samdom.example │         │  samdom.example │
└─────────────────┘         └─────────────────┘
```

Both DCs are equal peers — Samba AD uses multi-master replication. Changes on either DC replicate to the other.

## Prerequisites

- Primary DC (DC1) is running and provisioned
- Second machine/container with Samba installed (same version)
- Network connectivity between DC1 and DC2 (all AD ports)
- DNS on DC2 pointing to DC1

## Step 1: Start the Replica Container

The replica joins automatically via environment variables. Create a `docker-compose.replica.yml`:

```yaml
services:
  samba-dc2:
    build:
      context: .
      dockerfile: samba-ad-dc/Dockerfile
    container_name: samba-dc2
    hostname: dc2
    domainname: samdom.example.com
    restart: unless-stopped
    privileged: true
    environment:
      - SAMBA_REALM=SAMDOM.EXAMPLE.COM
      - SAMBA_DOMAIN=SAMDOM
      - SAMBA_ADMIN_PASSWORD=P@ssw0rd123!
      - SAMBA_DNS_FORWARDER=8.8.8.8
      - SAMBA_JOIN_AS_DC=true
      - SAMBA_PRIMARY_DC=dc1.samdom.example.com
      # - SAMBA_SITE=Branch-Office    # optional: AD site name
    ports:
      - "54:53/tcp"
      - "54:53/udp"
      - "89:88/tcp"
      - "390:389/tcp"
      - "446:445/tcp"
      - "637:636/tcp"
    volumes:
      - samba-dc2-data:/data
    dns:
      - 172.20.0.10
    networks:
      samba-net:
        ipv4_address: 172.20.0.11

networks:
  samba-net:
    external: true
    name: docker_samba-net

volumes:
  samba-dc2-data:
```

> Note: Ports are mapped to different host ports (54, 89, etc.) to avoid conflicts with DC1.

## Step 2: Start the Replica

```bash
docker compose -f docker-compose.replica.yml up -d
```

The container will automatically:

1. Detect `SAMBA_JOIN_AS_DC=true`
2. Configure DNS to point to the primary DC
3. Run `samba-tool domain join` with the provided credentials
4. Set up Kerberos and TLS
5. Start Samba as a replica DC

Watch the logs to monitor progress:

```bash
docker logs -f samba-dc2
```

You should see:

```
[Samba] Joining domain as replica DC...
  Realm:      SAMDOM.EXAMPLE.COM
  Primary DC: dc1.samdom.example.com
...
[Samba] Successfully joined domain as replica DC.
```

> The first join replicates the entire AD database and may take a few minutes depending on the domain size.

### Environment Variables for Replica Mode

| Variable               | Required | Description                                   |
|------------------------|----------|-----------------------------------------------|
| `SAMBA_JOIN_AS_DC`     | Yes      | Set to `true` to join instead of provisioning |
| `SAMBA_PRIMARY_DC`     | Yes      | FQDN of the primary DC to replicate from      |
| `SAMBA_ADMIN_PASSWORD` | Yes      | Domain admin password for authentication      |
| `SAMBA_REALM`          | Yes      | Must match the existing domain realm          |
| `SAMBA_DOMAIN`         | Yes      | Must match the existing NetBIOS domain        |
| `SAMBA_SITE`           | No       | AD site name for multi-site topology          |
| `SAMBA_DNS_FORWARDER`  | No       | DNS forwarder (default: `8.8.8.8`)            |

## Step 3: Verify Replication

### From DC1

```bash
docker exec samba-ad-dc samba-tool drs showrepl -U Administrator
```

Expected output shows replication partners and status:

```
=== INBOUND NEIGHBORS ===
DC=samdom,DC=example,DC=com
    Default-First-Site-Name\DC2 via RPC
        last attempt [timestamp] was successful
```

### From DC2

```bash
docker exec samba-dc2 samba-tool drs showrepl -U Administrator
```

### Test Replication

Create a user on DC1:

```bash
docker exec samba-ad-dc samba-tool user create testuser TestPass123! \
    -U Administrator
```

Verify it appears on DC2:

```bash
docker exec samba-dc2 samba-tool user list
# Should include "testuser"
```

## Step 4: Configure Clients for Multi-DC

### DNS

Clients should have both DCs as DNS servers:

- Primary DNS: `172.20.0.10` (DC1)
- Secondary DNS: `172.20.0.11` (DC2)

### Samba Conductor Web App

The web app connects to one DC. For failover, configure a load balancer or update the `ldapUrl` in settings to point
to DC2 if DC1 is down.

Future versions of Samba Conductor may support automatic DC failover.

## Monitoring Replication

### Check Replication Status

```bash
samba-tool drs showrepl -U Administrator
```

### Force Replication

```bash
# On DC2, pull changes from DC1
samba-tool drs replicate dc2.samdom.example.com dc1.samdom.example.com \
    DC=samdom,DC=example,DC=com -U Administrator
```

### Check for Replication Conflicts

```bash
samba-tool drs kcc -U Administrator
```

This runs the Knowledge Consistency Checker to verify and fix replication topology.

## FSMO Roles

By default, all FSMO (Flexible Single Master Operation) roles are on DC1:

```bash
samba-tool fsmo show
```

### Transfer FSMO Roles

If DC1 needs maintenance, transfer roles to DC2:

```bash
# Transfer all roles to DC2
samba-tool fsmo transfer --role=all -U Administrator \
    -H ldap://dc2.samdom.example.com
```

### Seize FSMO Roles (Emergency)

If DC1 is permanently unavailable:

```bash
# Force seize all roles (ONLY if DC1 will never come back)
samba-tool fsmo seize --role=all -U Administrator \
    -H ldap://dc2.samdom.example.com
```

> **Warning:** Only seize roles if DC1 is permanently lost. If DC1 comes back online with seized roles, it will cause
> conflicts.

## Removing a Replica DC

If you need to decommission DC2:

### Graceful Removal (DC2 is online)

```bash
# On DC2
samba-tool domain demote -U Administrator
```

### Forced Removal (DC2 is offline)

```bash
# On DC1 — remove DC2's metadata
samba-tool domain demote --remove-other-dead-server=DC2 -U Administrator
```

## Troubleshooting

### "DRS connection failed"

- Check network connectivity between DCs: `ping dc1.samdom.example.com`
- Verify all ports are open (53, 88, 135, 389, 445, 636, 3268)
- Check time sync — clocks must be within 5 minutes

### Replication Lag

- Force replication: `samba-tool drs replicate ...`
- Check KCC: `samba-tool drs kcc`
- Default replication interval is 15 minutes for intra-site

### "Access denied" on join

- Verify Administrator password
- Ensure DNS resolves correctly
- Check DC1 is accepting connections on port 389/636

## Required Ports Between DCs

| Port        | Protocol | Service                  |
|-------------|----------|--------------------------|
| 53          | TCP/UDP  | DNS                      |
| 88          | TCP/UDP  | Kerberos                 |
| 135         | TCP      | RPC Endpoint Mapper      |
| 389         | TCP/UDP  | LDAP                     |
| 445         | TCP      | SMB / AD Replication     |
| 464         | TCP/UDP  | Kerberos Password Change |
| 636         | TCP      | LDAPS                    |
| 3268        | TCP      | Global Catalog           |
| 49152-65535 | TCP      | Dynamic RPC              |
