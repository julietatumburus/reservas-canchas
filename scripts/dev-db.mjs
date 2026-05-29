// Controla el cluster PostgreSQL de DESARROLLO (aislado, puerto 5433).
// No toca el Postgres del sistema. Uso: node scripts/dev-db.mjs start|stop|status
import { spawnSync } from "node:child_process";
import path from "node:path";

const PG_BIN = process.env.PG_BIN || "C:\\Program Files\\PostgreSQL\\15\\bin";
const DATA = process.env.PG_DEV_DATA || "C:\\tmp\\pg-reservas";
const PORT = process.env.PG_DEV_PORT || "5433";

const pgctl = path.join(PG_BIN, "pg_ctl.exe");
const log = path.join(DATA, "server.log");
const cmd = process.argv[2] || "status";

const argsByCmd = {
  start: ["-D", DATA, "-o", `-p ${PORT}`, "-l", log, "-w", "start"],
  stop: ["-D", DATA, "-m", "fast", "stop"],
  status: ["-D", DATA, "status"],
};

const args = argsByCmd[cmd];
if (!args) {
  console.error("uso: node scripts/dev-db.mjs start|stop|status");
  process.exit(1);
}

const r = spawnSync(pgctl, args, { stdio: "inherit" });
process.exit(r.status ?? 0);
