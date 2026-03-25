#!/bin/bash
set -e

# Environment variables with defaults
SAMBA_REALM=${SAMBA_REALM:-"SAMDOM.EXAMPLE.COM"}
SAMBA_DOMAIN=${SAMBA_DOMAIN:-"SAMDOM"}
SAMBA_ADMIN_PASSWORD=${SAMBA_ADMIN_PASSWORD:-""}
SAMBA_DNS_FORWARDER=${SAMBA_DNS_FORWARDER:-"8.8.8.8"}
SAMBA_SERVER_ROLE=${SAMBA_SERVER_ROLE:-"dc"}

SAMBA_PROVISIONED="/var/lib/samba/.provisioned"

provision_domain() {
    if [ -z "$SAMBA_ADMIN_PASSWORD" ]; then
        echo "ERROR: SAMBA_ADMIN_PASSWORD is required for provisioning."
        exit 1
    fi

    echo "Provisioning Samba AD DC..."
    echo "  Realm:  ${SAMBA_REALM}"
    echo "  Domain: ${SAMBA_DOMAIN}"

    # Remove any existing configuration
    rm -f /etc/samba/smb.conf
    rm -rf /var/lib/samba/*

    samba-tool domain provision \
        --use-rfc2307 \
        --realm="${SAMBA_REALM}" \
        --domain="${SAMBA_DOMAIN}" \
        --server-role="${SAMBA_SERVER_ROLE}" \
        --dns-backend=SAMBA_INTERNAL \
        --adminpass="${SAMBA_ADMIN_PASSWORD}" \
        --option="dns forwarder = ${SAMBA_DNS_FORWARDER}"

    # Copy Kerberos configuration
    cp /var/lib/samba/private/krb5.conf /etc/krb5.conf

    touch "$SAMBA_PROVISIONED"
    echo "Samba AD DC provisioned successfully."
}

# Provision only on first run
if [ ! -f "$SAMBA_PROVISIONED" ]; then
    provision_domain
else
    echo "Samba AD DC already provisioned. Starting services..."
fi

# Start services via supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf
