FROM node:18-alpine AS base

# Download and install PostgREST static binary into base image
RUN apk add --no-cache libc6-compat curl xz
RUN curl -L -o /tmp/postgrest.tar.xz https://github.com/PostgREST/postgrest/releases/download/v12.2.0/postgrest-v12.2.0-linux-static-x64.tar.xz \
    && tar -xJ -f /tmp/postgrest.tar.xz -C /usr/local/bin \
    && rm /tmp/postgrest.tar.xz

FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=base /usr/local/bin/postgrest /usr/local/bin/postgrest

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && chown nextjs:nodejs ./entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV POSTGREST_URL="http://127.0.0.1:8000"

CMD ["./entrypoint.sh"]
