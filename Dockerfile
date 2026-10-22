FROM node:22.14.0-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund

FROM deps AS builder
COPY . .
RUN npm run build

FROM node:22.14.0-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

RUN mkdir -p /app/data && useradd --system --uid 1001 nextjs && chown -R nextjs:nextjs /app
USER nextjs

EXPOSE 3000
CMD ["npm", "run", "start"]
