FROM node:22-slim AS base

# The image ships an unprivileged `node` user (uid/gid 1000): own /app with it so
# every stage — including the dev bind-mount — can run without root.
RUN mkdir -p /app && chown -R node:node /app

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

USER node

FROM base AS dev

ENV NODE_ENV=development

EXPOSE 3000

CMD ["sh", "-c", "npm install && npm run dev -- --hostname 0.0.0.0 --port 3000"]

FROM base AS deps

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

COPY --chown=node:node . .
RUN npm run build

FROM base AS prod

# Runtime configuration (OPENAI_BASE_URL, OPENAI_MODEL, OPENAI_API_KEY, …) comes
# from the environment — never baked into the image.
ENV NODE_ENV=production

COPY --chown=node:node package.json package-lock.json ./
RUN npm ci

COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
