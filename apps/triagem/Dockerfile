# The screening service (DECISIONS round 20), for a host in São Paulo (Fly `gru`, or a Brazilian VPS).
# Build from the repository root: docker build -f apps/triagem/Dockerfile .
# Run with TRIAGEM_TOKEN set (32+ characters, the same value as the app's) behind the host's TLS.
FROM oven/bun:1-debian
WORKDIR /app
COPY apps/triagem/package.json ./
RUN bun install --production
COPY apps/triagem/src ./src
COPY apps/triagem/scripts ./scripts
# The pinned models, checked by SHA-256, baked into the image.
RUN bun scripts/models.ts
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3500
EXPOSE 3500
USER bun
CMD ["bun", "src/index.ts"]
