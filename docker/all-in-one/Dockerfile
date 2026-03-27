FROM zcloudws/meteor-build:3.4 AS builder

WORKDIR /app-source/source
USER root

RUN chown zcloud:zcloud -R /app-source
RUN mkdir -p /tmp/tools/{.node,.mongodb} && chown zcloud:zcloud -R /tmp/tools

USER zcloud

RUN export DEV_BUNDLE_DIR=/home/zcloud/.meteor/packages/meteor-tool/*.*.*/mt-os.linux.x86_64/dev_bundle && \
    cp -r $DEV_BUNDLE_DIR/{bin,lib} /tmp/tools/.node && \
    cp -r $DEV_BUNDLE_DIR/mongodb/bin /tmp/tools/.mongodb/

COPY --chown=zcloud:zcloud web /app-source/source

ENV METEOR_DISABLE_OPTIMISTIC_CACHING=1

#  --legacy-peer-deps because of react-error-boundary
RUN meteor npm i --no-audit --legacy-peer-deps && \
    meteor build --platforms web.browser --directory ../app-build

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
EXPOSE 3000/tcp
EXPOSE 27017/tcp
EXPOSE 49152-65535/tcp

# Non-root user for MongoDB
RUN useradd -r -s /sbin/nologin -d /opt/app conductor

# Shared samba scripts
COPY docker/scripts/samba-setup.sh /usr/local/lib/samba-setup.sh
RUN chmod +x /usr/local/lib/samba-setup.sh

# Image-specific files
COPY docker/all-in-one/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Supervisor config templates
COPY docker/all-in-one/supervisor/supervisord.conf /etc/supervisord.conf
COPY docker/all-in-one/supervisor/ /etc/supervisor/templates/
RUN mkdir -p /etc/supervisor/conf.d

# Meteor tools
COPY --from=builder /tmp/tools/.node /opt/nodejs/
COPY --from=builder /tmp/tools/.mongodb /opt/mongodb/
COPY --from=builder /app-source/app-build/bundle /opt/app

#  --legacy-peer-deps because of react-error-boundary
RUN cd /opt/app/programs/server && PATH=$PATH:/opt/nodejs/bin npm i --no-audit --legacy-peer-deps

# Single persistent volume
VOLUME ["/data"]

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
