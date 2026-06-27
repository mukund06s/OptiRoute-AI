# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
COPY prisma/ ../prisma/

RUN npx prisma generate --schema=../prisma/schema.prisma
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app/backend

ENV NODE_ENV=production

RUN apk add --no-cache curl

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/backend/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/backend/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/backend/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY prisma/ ../prisma/

COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://127.0.0.1:5000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
