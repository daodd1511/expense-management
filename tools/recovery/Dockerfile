# syntax=docker/dockerfile:1
FROM postgres:17-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends age libdigest-sha-perl \
    && rm -rf /var/lib/apt/lists/*

COPY tools/recovery/archive.sh /usr/local/bin/wallet-archive
COPY tools/recovery/restore-rehearsal.sh /usr/local/bin/wallet-restore-rehearsal

USER postgres
ENTRYPOINT ["/usr/local/bin/wallet-archive"]
