# =============================================================================
# Samba Conductor — All-in-One Image
# Base: zcloud meteor runtime (Node.js + MongoDB) + Samba 4 AD DC
# Single volume (/data) for all persistent state
# =============================================================================

# Stage 1: Build Meteor application
FROM zcloudws/meteor-build:3.4 AS builder

WORKDIR /app-source/source
USER root
RUN chown zcloud:zcloud -R /app-source

USER zcloud
COPY --chown=zcloud:zcloud web /app-source/source

ENV METEOR_DISABLE_OPTIMISTIC_CACHING=1

RUN meteor npm i --no-audit --legacy-peer-deps \
    && meteor build --platforms web.browser --directory ../app-build

RUN cd /app-source/app-build/bundle/programs/server \
    && npm i --no-audit --legacy-peer-deps

# Stage 2: All-in-one runtime (Node.js + MongoDB from zcloud + Samba)
FROM zcloudws/meteor-node-mongodb-runtime:3.4-with-tools

LABEL maintainer="samba-conductor"
LABEL description="Samba Conductor All-in-One: Samba 4 AD DC + Web UI + MongoDB"

USER root

# Install Samba AD DC and dependencies on Ubuntu 22.04
RUN apt-get update && apt-get install -y --no-install-recommends \
    samba \
    samba-dsdb-modules \
    samba-vfs-modules \
    winbind \
    krb5-user \
    ldap-utils \
    supervisor \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Copy built Meteor app
COPY --from=builder --chown=zcloud:zcloud /app-source/app-build/bundle /home/zcloud/app

# Shared samba scripts
COPY docker/scripts/samba-setup.sh /usr/local/lib/samba-setup.sh
RUN chmod +x /usr/local/lib/samba-setup.sh

# Image-specific files
COPY docker/all-in-one/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/all-in-one/supervisord.conf /etc/supervisord.conf
RUN chmod +x /usr/local/bin/entrypoint.sh

# Single persistent volume
VOLUME ["/data"]

# Samba ports
EXPOSE 53/tcp 53/udp
EXPOSE 88/tcp 88/udp
EXPOSE 135/tcp
EXPOSE 389/tcp 389/udp
EXPOSE 445/tcp
EXPOSE 464/tcp 464/udp
EXPOSE 636/tcp
EXPOSE 3268/tcp
EXPOSE 3269/tcp

# Web UI
EXPOSE 3000/tcp

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
