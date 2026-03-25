# Samba 4 Active Directory Domain Controller (standalone)
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
    openssl \
    && microdnf clean all \
    && rm -rf /var/cache/dnf

# Samba ports
EXPOSE 53/tcp 53/udp
EXPOSE 88/tcp 88/udp
EXPOSE 135/tcp
EXPOSE 137/udp
EXPOSE 138/udp
EXPOSE 139/tcp
EXPOSE 389/tcp 389/udp
EXPOSE 445/tcp
EXPOSE 464/tcp 464/udp
EXPOSE 636/tcp
EXPOSE 3268/tcp
EXPOSE 3269/tcp
EXPOSE 49152-65535/tcp

# Shared samba scripts
COPY scripts/samba-setup.sh /usr/local/lib/samba-setup.sh
RUN chmod +x /usr/local/lib/samba-setup.sh

# Image-specific files
COPY samba-ad-dc/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY samba-ad-dc/supervisord.conf /etc/supervisord.conf
RUN chmod +x /usr/local/bin/entrypoint.sh

# Single persistent volume
VOLUME ["/data"]

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
