FROM zcloudws/meteor-build:3.4 AS builder

WORKDIR /app-source/source
USER root

RUN chown zcloud:zcloud -R /app-source

USER zcloud
COPY --chown=zcloud:zcloud . /app-source/source

ENV METEOR_DISABLE_OPTIMISTIC_CACHING=1

#  --legacy-peer-deps because of react-error-boundary
RUN meteor npm i --no-audit --legacy-peer-deps && meteor build --directory ../app-build

FROM zcloudws/meteor-node-mongodb-runtime:3.4-with-tools

# Install Samba tools needed at runtime for AD management (samba-tool, ldap-utils)
USER root
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    samba-common-bin \
    samba-dsdb-modules \
    samba-vfs-modules \
    ldap-utils \
    krb5-user \
    && rm -rf /var/lib/apt/lists/*
USER zcloud

COPY --from=builder /app-source/app-build/bundle /home/zcloud/app

#  --legacy-peer-deps because of react-error-boundary
RUN cd /home/zcloud/app/programs/server && npm i  --no-audit --legacy-peer-deps

WORKDIR /home/zcloud/app

ENTRYPOINT ["/scripts/startup.sh"]
