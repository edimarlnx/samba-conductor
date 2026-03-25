#!/bin/bash
set -e

# Environment variables with defaults
SAMBA_REALM=${SAMBA_REALM:-"SAMDOM.EXAMPLE.COM"}
SAMBA_DOMAIN=${SAMBA_DOMAIN:-"SAMDOM"}
SAMBA_ADMIN_PASSWORD=${SAMBA_ADMIN_PASSWORD:-""}
SAMBA_DNS_FORWARDER=${SAMBA_DNS_FORWARDER:-"8.8.8.8"}
SAMBA_SERVER_ROLE=${SAMBA_SERVER_ROLE:-"dc"}

SAMBA_PROVISIONED="/var/lib/samba/.provisioned"
TLS_DIR="/var/lib/samba/private/tls"

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

generate_tls_certificate() {
    # Generate self-signed TLS certificate for LDAPS
    # Stored in a volume-backed path so it persists across restarts
    if [ -f "${TLS_DIR}/cert.pem" ] && [ -f "${TLS_DIR}/key.pem" ]; then
        echo "TLS certificate already exists, skipping generation."
        return
    fi

    echo "Generating self-signed TLS certificate..."
    mkdir -p "${TLS_DIR}"

    SAMBA_REALM_LOWER=$(echo "${SAMBA_REALM}" | tr '[:upper:]' '[:lower:]')
    HOSTNAME_FQDN="dc1.${SAMBA_REALM_LOWER}"

    openssl req -x509 -nodes -newkey rsa:4096 \
        -keyout "${TLS_DIR}/key.pem" \
        -out "${TLS_DIR}/cert.pem" \
        -days 3650 \
        -subj "/CN=${HOSTNAME_FQDN}/O=${SAMBA_DOMAIN}/C=BR" \
        -addext "subjectAltName=DNS:${HOSTNAME_FQDN},DNS:localhost,IP:127.0.0.1,IP:172.20.0.10"

    # CA file is the same as cert for self-signed
    cp "${TLS_DIR}/cert.pem" "${TLS_DIR}/ca.pem"

    chmod 600 "${TLS_DIR}/key.pem"
    chmod 644 "${TLS_DIR}/cert.pem" "${TLS_DIR}/ca.pem"

    echo "TLS certificate generated: ${TLS_DIR}/cert.pem"
}

configure_tls() {
    # Configure Samba to use TLS for LDAPS
    if grep -q "tls certfile" /etc/samba/smb.conf; then
        echo "TLS already configured in smb.conf."
        return
    fi

    sed -i "/^\[global\]/a \\
\\ttls enabled  = yes\\n\\
\\ttls certfile = ${TLS_DIR}/cert.pem\\n\\
\\ttls keyfile  = ${TLS_DIR}/key.pem\\n\\
\\ttls cafile   = ${TLS_DIR}/ca.pem" /etc/samba/smb.conf

    echo "Configured TLS in smb.conf."
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

# Generate TLS certificate and configure Samba for LDAPS
generate_tls_certificate
configure_tls

# Start services via supervisor
exec /usr/bin/supervisord -c /etc/supervisord.conf
