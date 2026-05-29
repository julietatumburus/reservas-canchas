# Build + run de la app Next.js. Node 24: requerido por Prisma 7 (necesita 20.19+/22.12+/24+).
FROM node:24-slim

WORKDIR /app

# openssl: lo necesitan los engines de Prisma (generate / migrate deploy).
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Dependencias primero (mejor cache). --ignore-scripts evita correr el postinstall
# (prisma generate) antes de copiar el schema; se corre luego en `npm run build`.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Código y build. Las NEXT_PUBLIC_* se inyectan en build → van como ARG/ENV.
COPY . .
ARG NEXT_PUBLIC_ROOT_DOMAIN
ENV NEXT_PUBLIC_ROOT_DOMAIN=$NEXT_PUBLIC_ROOT_DOMAIN
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
# start corre `prisma migrate deploy && next start` (definido en package.json).
CMD ["npm", "run", "start"]
