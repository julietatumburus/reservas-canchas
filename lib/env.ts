import { z } from "zod";

// Validación de variables de entorno del servidor.
// Las secretas son opcionales en esta fase (fundación + landing) para que la app
// arranque sin configurarlas; se vuelven necesarias en iteraciones posteriores
// (auth, pagos). DATABASE_URL solo es requerida al usar la DB (ver lib/prisma.ts).
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // PostgreSQL (Coolify/Hetzner). Requerida para Prisma migrate y queries.
  DATABASE_URL: z.string().min(1).optional(),

  // Dominio raíz para el multitenancy por subdominio.
  // Dev: "lvh.me:3000" (wildcard -> 127.0.0.1). Prod: "tuapp.com".
  NEXT_PUBLIC_ROOT_DOMAIN: z.string().min(1).default("lvh.me:3000"),

  // Auth.js
  AUTH_SECRET: z.string().optional(),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  // Lista de emails (coma-separada) que son SUPERADMIN de la plataforma.
  SUPERADMIN_EMAILS: z.string().optional(),
  // Habilita el login de prueba (dev). Poné "false" para desactivarlo.
  ALLOW_DEV_LOGIN: z.string().optional(),

  // MercadoPago (iteración 4)
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Variables de entorno inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuración de entorno inválida. Revisá tu .env (ver .env.example).");
}

export const env = parsed.data;

// Dominio raíz accesible también en cliente (para construir URLs de subdominio).
export const ROOT_DOMAIN =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "lvh.me:3000";
