# Samba 4 Active Directory Domain Controller
# Based on Fedora minimal for smallest possible image
FROM registry.fedoraproject.org/fedora-minimal:42

LABEL maintainer="samba-conductor"
LABEL description="Samba 4 AD DC on Fedora minimal"

# Install Samba AD DC and required dependencies
RUN microdnf install -y \
    samba \
    samba-dc \
    samba-client \
    samba-winbind \
    samba-winbind-clients \
    krb5-workstation \
    bind-utils \
    supervisor \
    tdb-tools \
    ldb-tools \
    findutils \
    procps-ng \
    && microdnf clean all \
    && rm -rf /var/cache/dnf

# Samba ports
# DNS
EXPOSE 53/tcp 53/udp
# Kerberos
EXPOSE 88/tcp 88/udp
# End Point Mapper (DCE/RPC Locator Service)
EXPOSE 135/tcp
# NetBIOS Name Service
EXPOSE 137/udp
# NetBIOS Datagram
EXPOSE 138/udp
# NetBIOS Session / SMB
EXPOSE 139/tcp
# LDAP
EXPOSE 389/tcp 389/udp
# SMB over TCP
EXPOSE 445/tcp
# Kerberos kpasswd
EXPOSE 464/tcp 464/udp
# LDAPS
EXPOSE 636/tcp
# Global Catalog
EXPOSE 3268/tcp
# Global Catalog SSL
EXPOSE 3269/tcp
# Dynamic RPC ports
EXPOSE 49152-65535/tcp

# Volumes for persistent data
VOLUME ["/var/lib/samba", "/etc/samba", "/var/log/samba"]

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY supervisord.conf /etc/supervisord.conf
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
