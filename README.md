# Saque — Reservas de canchas (padel/tenis)

SaaS **multitenant** de reservas de canchas inspirado en RankPlay, enfocado en
padel y tenis. Cada club tiene su propio subdominio (`club.tuapp.com`), gestiona
sus canchas y horarios, y los jugadores reservan y pagan online con MercadoPago.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** (config en CSS)
- **Prisma 7** + PostgreSQL (vía driver adapter `@prisma/adapter-pg`)
- **Auth.js (NextAuth v5)** — Google + email *(iteración 2)*
- **MercadoPago** *(iteración 4)*
- Deploy: **Coolify** sobre **Hetzner**

## Requisitos

- Node.js 20+ (probado con 22)
- Una base **PostgreSQL** (en Coolify/Hetzner, o local)

> Nota de red: si `npm`/`npx` falla con `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
> (antivirus/proxy que intercepta TLS), anteponé `NODE_OPTIONS=--use-system-ca`
> a los comandos, p. ej. `NODE_OPTIONS=--use-system-ca npm install`.

## Puesta en marcha

```bash
# 1. Instalar dependencias (corre prisma generate por postinstall)
npm install

# 2. Configurar variables de entorno
cp .env.example .env
#   -> completá DATABASE_URL (ver "Base de datos" más abajo) y AUTH_SECRET

# 3. Levantar el Postgres de desarrollo (cluster aislado, puerto 5433)
npm run dev:db          # arranca; no arranca solo al prender la PC

# 4. Crear las tablas en la base
npm run db:migrate      # prisma migrate dev

# 5. Levantar el server de desarrollo
npm run dev
```

Abrí **http://lvh.me:3000** (no `localhost`) para ver la landing.

### Multitenancy en desarrollo

El club se resuelve por **subdominio**. En dev usamos `lvh.me`, que (junto con
`*.lvh.me`) resuelve a `127.0.0.1` sin tocar `hosts`:

- `http://lvh.me:3000` → landing + (luego) panel.
- `http://laquinta.lvh.me:3000` → app del club `laquinta` (hoy, placeholder).

La resolución vive en [`proxy.ts`](proxy.ts) + [`lib/tenant.ts`](lib/tenant.ts).
El dominio raíz se configura con `NEXT_PUBLIC_ROOT_DOMAIN` (dev `lvh.me:3000`,
prod `tuapp.com`).

## Base de datos (Prisma 7)

Prisma 7 ya no acepta `url` en el `schema.prisma`: la conexión del CLI vive en
[`prisma.config.ts`](prisma.config.ts) y en runtime el cliente se conecta con el
driver adapter de Postgres (ver [`lib/prisma.ts`](lib/prisma.ts)).

```bash
npm run db:migrate    # crear/aplicar migraciones (dev)
npm run db:push       # empujar el schema sin migración (prototipado)
npm run db:studio     # abrir Prisma Studio
npm run db:generate   # regenerar el cliente
```

El cliente se genera en `lib/generated/prisma` (ignorado por git; se regenera en
cada `install`/`build`).

### Postgres de desarrollo (local, aislado)

Para dev usamos un **cluster propio en el puerto 5433** (no toca el Postgres del
sistema ni necesita admin). Se controla con:

```bash
npm run dev:db          # arrancar
npm run dev:db:status   # estado
npm run dev:db:stop     # parar
```

`DATABASE_URL="postgresql://postgres:postgres@localhost:5433/reservas?schema=public"`.
Los datos viven en `C:\tmp\pg-reservas` (configurable con `PG_DEV_DATA`,
`PG_DEV_PORT`, `PG_BIN`). En **producción** se reemplaza por el Postgres de Coolify.

## Auth y roles

Login con **Auth.js v5** (ver [`lib/auth.ts`](lib/auth.ts)): Google OAuth +
un **login de prueba** (solo dev: entrás con un email, sin clave). Sesiones JWT;
la cookie usa dominio `.<root>` para compartir sesión entre el dominio raíz y los
subdominios de cada club.

Roles:
- `SUPERADMIN` (plataforma) — definido por `SUPERADMIN_EMAILS`. Panel en `/admin`.
- `OWNER`/`ADMIN` (dueño del club) — ABM de canchas y horarios.
- `STAFF` (empleado) — acceso acotado.
- `USER` (jugador) — reserva turnos.

Env relevante: `AUTH_SECRET`, `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` (opcional en
dev), `SUPERADMIN_EMAILS`, `ALLOW_DEV_LOGIN`.

## Estructura

```
app/
  (marketing)/page.tsx     landing (dominio raíz)
  club/[slug]/page.tsx     app del club (servida por subdominio vía proxy)
  ingresar/, registrar-club/   placeholders (auth real en iter. 2)
components/                navbar, footer, logo, íconos, secciones de la landing
lib/
  prisma.ts                cliente Prisma + driver adapter
  tenant.ts                resolución de subdominio (puro, edge-safe)
  env.ts                   validación de entorno (zod)
prisma/schema.prisma       modelo de datos completo
prisma.config.ts           config del CLI de Prisma 7
proxy.ts                   routing multitenant por subdominio
```

## Modelo de datos

Una sola DB, todo discriminado por `clubId`: **Club**, **User** (+ modelos de
Auth.js), **Membership**, **Court** (cancha), **WeeklyAvailability** (horarios),
**AvailabilityException**, **Booking** (turno), **Payment**, **Subscription**.
Los slots disponibles se generan en runtime a partir de `WeeklyAvailability`.

## Roadmap

- **Iter. 1** ✅ — Fundación + landing + rebranding.
- **Iter. 2** ✅ — Auth + roles (RBAC) + alta de club + **gestión de canchas y horarios** + panel superadmin.
- **Iter. 3** — Flujo de reserva del jugador (grilla por subdominio → crear turno).
- **Iter. 4** — Pagos con MercadoPago (turno + suscripción del club).
- **Iter. 5** — Deploy en Coolify (DNS wildcard, env, Postgres gestionado).
