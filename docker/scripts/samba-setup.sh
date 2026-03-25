#!/bin/bash
# =============================================================================
# Shared Samba setup script
# Used by both samba-ad-dc (standalone) and all-in-one images
#
# Expects these variables to be set before sourcing:
#   SAMBA_REALM, SAMBA_DOMAIN, SAMBA_ADMIN_PASSWORD,
#   SAMBA_DNS_FORWARDER, SAMBA_SERVER_ROLE, DATA_DIR
# =============================================================================

SAMBA_DATA="${DATA_DIR}/samba"
SAMBA_CONFIG="${DATA_DIR}/samba-config"
SAMBA_LOGS="${DATA_DIR}/logs/samba"
TLS_DIR="${SAMBA_DATA}/private/tls"
SAMBA_PROVISIONED="${SAMBA_DATA}/.provisioned"

# -----------------------------------------------------------------------------
# Create directory structure and symlink standard paths to /data
# -----------------------------------------------------------------------------
setup_samba_directories() {
    mkdir -p "${SAMBA_DATA}" "${SAMBA_CONFIG}" "${SAMBA_LOGS}"

    [ -L /var/lib/samba ] || { rm -rf /var/lib/samba; ln -sf "${SAMBA_DATA}" /var/lib/samba; }
    [ -L /etc/samba ]     || { rm -rf /etc/samba;     ln -sf "${SAMBA_CONFIG}" /etc/samba; }
    [ -L /var/log/samba ] || { rm -rf /var/log/samba;  ln -sf "${SAMBA_LOGS}" /var/log/samba; }
}

# -----------------------------------------------------------------------------
# Provision the AD domain (first run only)
# -----------------------------------------------------------------------------
provision_samba_domain() {
    if [ -f "$SAMBA_PROVISIONED" ]; then
        echo "[Samba] Already provisioned."
        return
    fi

    if [ -z "$SAMBA_ADMIN_PASSWORD" ]; then
        echo "ERROR: SAMBA_ADMIN_PASSWORD is required for provisioning."
        exit 1
    fi

    echo "[Samba] Provisioning AD DC..."
    echo "  Realm:  ${SAMBA_REALM}"
    echo "  Domain: ${SAMBA_DOMAIN}"

    rm -f /etc/samba/smb.conf
    rm -rf /var/lib/samba/*

    samba-tool domain provision \
        --use-rfc2307 \
        --realm="${SAMBA_REALM}" \
        --domain="${SAMBA_DOMAIN}" \
        --server-role="${SAMBA_SERVER_ROLE}" \
        --dns-backend=SAMBA_INTERNAL \
        --adminpass="${SAMBA_ADMIN_PASSWORD}" \
        --option="dns forwarder = ${SAMBA_DNS_FORWARDER}" \
        --option="ad dc functional level = 2016"

    # Raise domain and forest functional levels to 2016
    samba-tool domain level raise --domain-level=2016 --forest-level=2016 || true

    touch "$SAMBA_PROVISIONED"
    echo "[Samba] Provisioned at Windows Server 2016 functional level."
}

# -----------------------------------------------------------------------------
# Ensure Kerberos configuration is correct
# -----------------------------------------------------------------------------
setup_kerberos() {
    if [ -f /var/lib/samba/private/krb5.conf ]; then
        cp /var/lib/samba/private/krb5.conf /etc/krb5.conf
    else
        local realm_lower
        realm_lower=$(echo "${SAMBA_REALM}" | tr '[:upper:]' '[:lower:]')
        cat > /etc/krb5.conf <<EOF
[libdefaults]
    default_realm = ${SAMBA_REALM}
    dns_lookup_realm = false
    dns_lookup_kdc = true
[realms]
    ${SAMBA_REALM} = {
        default_domain = ${realm_lower}
    }
[domain_realm]
    .${realm_lower} = ${SAMBA_REALM}
    ${realm_lower} = ${SAMBA_REALM}
EOF
    fi
    echo "[Samba] Kerberos configured: $(grep default_realm /etc/krb5.conf | head -1 | xargs)"
}

# -----------------------------------------------------------------------------
# Generate self-signed TLS certificate if missing
# -----------------------------------------------------------------------------
setup_tls() {
    if [ -f "${TLS_DIR}/cert.pem" ] && [ -f "${TLS_DIR}/key.pem" ]; then
        echo "[Samba] TLS certificate exists."
    else
        echo "[Samba] Generating self-signed TLS certificate..."
        mkdir -p "${TLS_DIR}"
        local realm_lower fqdn
        realm_lower=$(echo "${SAMBA_REALM}" | tr '[:upper:]' '[:lower:]')
        fqdn="dc1.${realm_lower}"

        openssl req -x509 -nodes -newkey rsa:4096 \
            -keyout "${TLS_DIR}/key.pem" \
            -out "${TLS_DIR}/cert.pem" \
            -days 3650 \
            -subj "/CN=${fqdn}/O=${SAMBA_DOMAIN}/C=BR" \
            -addext "subjectAltName=DNS:${fqdn},DNS:localhost,IP:127.0.0.1" \
            2>/dev/null

        cp "${TLS_DIR}/cert.pem" "${TLS_DIR}/ca.pem"
        chmod 600 "${TLS_DIR}/key.pem"
        chmod 644 "${TLS_DIR}/cert.pem" "${TLS_DIR}/ca.pem"
        echo "[Samba] TLS certificate generated."
    fi

    # Configure smb.conf for TLS
    if ! grep -q "tls certfile" /etc/samba/smb.conf 2>/dev/null; then
        sed -i "/^\[global\]/a \\
\\ttls enabled  = yes\\n\\
\\ttls certfile = ${TLS_DIR}/cert.pem\\n\\
\\ttls keyfile  = ${TLS_DIR}/key.pem\\n\\
\\ttls cafile   = ${TLS_DIR}/ca.pem" /etc/samba/smb.conf
        echo "[Samba] TLS configured in smb.conf."
    fi
}

# -----------------------------------------------------------------------------
# Run full Samba setup
# -----------------------------------------------------------------------------
setup_samba() {
    setup_samba_directories
    provision_samba_domain
    setup_kerberos
    setup_tls
}
