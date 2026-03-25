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

    touch "$SAMBA_PROVISIONED"
    echo "Samba AD DC provisioned successfully."
}

# Provision only on first run
if [ ! -f "$SAMBA_PROVISIONED" ]; then
    provision_domain
else
    echo "Samba AD DC already provisioned. Starting services..."
fi

# Always ensure krb5.conf is correct before starting
# The provisioned krb5.conf may not persist across restarts since /etc is not a volume
if [ -f /var/lib/samba/private/krb5.conf ]; then
    cp /var/lib/samba/private/krb5.conf /etc/krb5.conf
else
    # Generate a minimal krb5.conf if the provisioned one is missing
    SAMBA_REALM_LOWER=$(echo "${SAMBA_REALM}" | tr '[:upper:]' '[:lower:]')
    cat > /etc/krb5.conf <<EOF
[libdefaults]
    default_realm = ${SAMBA_REALM}
    dns_lookup_realm = false
    dns_lookup_kdc = true

[realms]
    ${SAMBA_REALM} = {
        default_domain = ${SAMBA_REALM_LOWER}
    }

[domain_realm]
    .${SAMBA_REALM_LOWER} = ${SAMBA_REALM}
    ${SAMBA_REALM_LOWER} = ${SAMBA_REALM}
EOF
fi

echo "Kerberos default_realm: $(grep default_realm /etc/krb5.conf | head -1)"

# Allow simple LDAP binds without TLS (development only)
# In production, configure TLS certificates and remove this setting
if ! grep -q "ldap server require strong auth" /etc/samba/smb.conf; then
    sed -i '/^\[global\]/a \\tldap server require strong auth = no' /etc/samba/smb.conf
    echo "Configured: ldap server require strong auth = no"
fi

# Start services via supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf
