# Docker Deployment

Samba Conductor provides three Docker image variants for different deployment scenarios.

## Image Variants

| Image           | Contents                      | Use Case                                      |
|-----------------|-------------------------------|-----------------------------------------------|
| **samba-ad-dc** | Samba 4 AD DC only            | Standalone DC with web app running separately |
| **web**         | Meteor + MongoDB + samba-tool | Web UI connecting to an external Samba DC     |
| **all-in-one**  | Samba + Meteor + MongoDB      | Single-box deployment with everything         |

## All-in-One (Recommended for Small Deployments)

Everything in a single container with one persistent volume.

```bash
cd docker/all-in-one
docker compose up -d
```

Access the web UI at `http://localhost:3000`.

### Environment Variables

```yaml
environment:
  - SAMBA_REALM=YOURCOMPANY.COM
  - SAMBA_DOMAIN=YOURCOMPANY
  - SAMBA_ADMIN_PASSWORD=YourStrongPassword!
  - ROOT_URL=https://conductor.yourcompany.com
  - PORT=3000
```

## Standalone DC + Separate Web App

For larger deployments or when you want to separate concerns.

### Start the DC

```bash
cd docker
docker compose up -d
```

### Start the Web App

```bash
cd web
meteor npm install
meteor npm start
```

Or deploy the web container separately with its own `docker compose`.

## Persistence

All images use a single `/data` volume:

```
/data/
├── samba/          # AD database, TLS certs
├── samba-config/   # smb.conf
├── mongodb/        # MongoDB data (all-in-one)
└── logs/           # All service logs
```

### Backup

```bash
# Stop the container
docker compose stop

# Backup the volume
docker run --rm -v docker_conductor-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/samba-conductor-backup.tar.gz /data

# Restart
docker compose start
```

### Restore

```bash
docker compose down -v
docker volume create docker_conductor-data
docker run --rm -v docker_conductor-data:/data -v $(pwd):/backup alpine \
  tar xzf /backup/samba-conductor-backup.tar.gz -C /
docker compose up -d
```

## TLS Certificates

A self-signed certificate is auto-generated on first start.

### Using Your Own Certificate

Mount your certificates into the data volume:

```
/data/samba/private/tls/
├── cert.pem    # Server certificate
├── key.pem     # Private key
└── ca.pem      # CA certificate
```

If these files exist before first start, the auto-generation is skipped.

## Domain Functional Level

Domains are provisioned at **Windows Server 2016** functional level by default, providing compatibility with modern
Windows features and clients.

## Health Check

The web app exposes a health endpoint:

```bash
curl http://localhost:3000/api
# {"status":"success"}
```

## Updating

```bash
# Pull latest images and rebuild
docker compose pull
docker compose build
docker compose up -d
```

Your `/data` volume persists across updates.
