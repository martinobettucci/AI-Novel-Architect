FROM node:22-slim AS base

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

FROM base AS dev

ENV NODE_ENV=development

EXPOSE 3000

CMD ["sh", "-c", "npm install && npm run dev -- --hostname 0.0.0.0 --port 3000"]

FROM base AS deps

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder

COPY . .
RUN npm run build

FROM base AS prod

ENV NODE_ENV=production
ENV OPENAI_BASE_URL=http://192.168.0.37:11434
ENV OPENAI_MODEL=gpt-oss:20b

COPY package.json package-lock.json ./
RUN npm ci

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
