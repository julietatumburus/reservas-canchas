import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: la conexión usada por el CLI (migrate / db push / studio) vive acá.
// En runtime, el PrismaClient se conecta vía driver adapter (ver lib/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
