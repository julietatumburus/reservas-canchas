import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/lib/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no está definida. Configurá la conexión a PostgreSQL en .env",
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

let instance: PrismaClient | undefined = globalForPrisma.prisma;

function getClient(): PrismaClient {
  if (!instance) {
    instance = createPrismaClient();
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = instance;
  }
  return instance;
}

// Proxy de inicialización perezosa: el cliente (y la conexión) se crean recién
// al primer uso real, no al importar el módulo. Así `next build` no necesita
// DATABASE_URL para analizar las rutas.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
