#!/bin/bash
set -e

# =============================================================================
# Environment variables
# =============================================================================
SAMBA_REALM=${SAMBA_REALM:-"SAMDOM.EXAMPLE.COM"}
SAMBA_DOMAIN=${SAMBA_DOMAIN:-"SAMDOM"}
SAMBA_ADMIN_PASSWORD=${SAMBA_ADMIN_PASSWORD:-""}
SAMBA_DNS_FORWARDER=${SAMBA_DNS_FORWARDER:-"8.8.8.8"}
SAMBA_SERVER_ROLE=${SAMBA_SERVER_ROLE:-"dc"}
DATA_DIR=${DATA_DIR:-"/data"}

ROOT_URL=${ROOT_URL:-"http://localhost:3000"}
PORT=${PORT:-3000}

# =============================================================================
# Setup MongoDB directories
# =============================================================================
MONGO_DATA="${DATA_DIR}/mongodb"
MONGO_LOGS="${DATA_DIR}/logs/mongodb"
APP_LOGS="${DATA_DIR}/logs/app"

mkdir -p "${MONGO_DATA}" "${MONGO_LOGS}" "${APP_LOGS}"
chown -R zcloud:zcloud "${MONGO_DATA}" "${MONGO_LOGS}" "${APP_LOGS}"

# =============================================================================
# Run shared Samba setup (provision, kerberos, TLS)
# =============================================================================
source /usr/local/lib/samba-setup.sh
setup_samba

# =============================================================================
# Generate environment file for the web app
# =============================================================================
SAMBA_REALM_LOWER=$(echo "${SAMBA_REALM}" | tr '[:upper:]' '[:lower:]')
BASE_DN="DC=$(echo "${SAMBA_REALM_LOWER}" | sed 's/\./,DC=/g')"

cat > /etc/samba-conductor.env <<ENVEOF
export ROOT_URL="${ROOT_URL}"
export PORT="${PORT}"
export MONGO_URL="mongodb://127.0.0.1:27017/samba-conductor"
export METEOR_SETTINGS='{"samba":{"ldapUrl":"ldaps://127.0.0.1:636","baseDn":"${BASE_DN}","realm":"${SAMBA_REALM}","tlsRejectUnauthorized":false,"sessionTtlMinutes":30},"public":{"appInfo":{"name":"Samba Conductor"}}}'
ENVEOF

echo "=== Samba Conductor All-in-One ==="
echo "  Realm:  ${SAMBA_REALM}"
echo "  Web UI: ${ROOT_URL}"
echo "  Data:   ${DATA_DIR}"

# Start all services via supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf
