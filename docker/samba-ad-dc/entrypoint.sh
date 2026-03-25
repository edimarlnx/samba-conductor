#!/bin/bash
set -e

# Environment variables with defaults
SAMBA_REALM=${SAMBA_REALM:-"SAMDOM.EXAMPLE.COM"}
SAMBA_DOMAIN=${SAMBA_DOMAIN:-"SAMDOM"}
SAMBA_ADMIN_PASSWORD=${SAMBA_ADMIN_PASSWORD:-""}
SAMBA_DNS_FORWARDER=${SAMBA_DNS_FORWARDER:-"8.8.8.8"}
SAMBA_SERVER_ROLE=${SAMBA_SERVER_ROLE:-"dc"}
DATA_DIR=${DATA_DIR:-"/data"}

# Run shared Samba setup
source /usr/local/lib/samba-setup.sh
setup_samba

# Start services via supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf
