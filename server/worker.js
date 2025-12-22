import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

import { logger } from "./utils/logger.js";

import { getDb, initDatabase } from "./db.js";
import { createReservationRepository } from "./repositories/reservationRepository.js";
import { createOrderRepository } from "./repositories/orderRepository.js";
import { createMercadoPagoService } from "./services/mercadopagoService.js";
import { createOrderService } from "./services/orderService.js";
import { createCronService } from "./services/cronService.js";
import { createExpireOrdersCron } from "./cron/expireOrderCron.js";
import { createMailService } from "./services/mailService.js";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---- BOOT LOG CONTEXT
const bootId = uuidv4();
const bootStartedAt = Date.now();
const log = logger.child({ bootId, component: "worker" });

// Solo cargar .env.local en dev
if (process.env.NODE_ENV !== "prod") {
  dotenv.config({ path: ".env.local" });
  log.info({ envFile: ".env.local" }, "[WORKER] dotenv loaded");
}

log.info(
  {
    nodeEnv: process.env.NODE_ENV,
    cronBatchSize: Number(process.env.CRON_BATCH_SIZE || 50),
    intervalMin: Number(process.env.EXPIRE_CRON_MINUTE || 90),
    mailMode: process.env.NODE_ENV === "prod" ? "sesApi" : (process.env.MAIL_MODE || "file"),
  },
  "[WORKER] boot start"
);

// ---- INIT SERVICES
const db = getDb();

const reservationRepository = createReservationRepository(db);
const orderRepository = createOrderRepository(db);
const orderService = createOrderService(db, orderRepository, reservationRepository);

const mercadoPagoService = createMercadoPagoService({
  accessToken: process.env.ACCESS_TOKEN,
  webhookUrl: process.env.WEBHOOK_URL,
  successUrl: process.env.MP_SUCCESS_URL,
  pendingUrl: process.env.MP_PENDING_URL,
  failureUrl: process.env.MP_FAILURE_URL,
});

log.info(
  {
    mp: {
      webhookUrl: process.env.WEBHOOK_URL || null,
      accessToken: process.env.ACCESS_TOKEN ? "set" : "missing",
    },
  },
  "[WORKER] MercadoPago service initialized"
);

// MailService
const mailMode =
  process.env.NODE_ENV === "prod" ? "sesApi" : process.env.MAIL_MODE || "file";
const mailService = createMailService({ mode: mailMode });

// DB init (worker normalmente NO resetea)
try {
  await initDatabase(db, false);
} catch (err) {
  process.exit(1);
}

const cronService = createCronService({
  db,
  mercadoPagoService,
  orderService,
  mailService,
  batchSize: Number(process.env.CRON_BATCH_SIZE || 50),
});

const cron = createExpireOrdersCron({
  cronService,
  intervalMin: Number(process.env.EXPIRE_CRON_MINUTE || 90),
});

// ---- START CRON
log.info({ durationMs: Date.now() - bootStartedAt }, "[WORKER] ready - starting cron");
cron.start();

// ---- SHUTDOWN
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  log.warn(
    { signal, uptimeMs: Date.now() - bootStartedAt },
    "[WORKER] shutdown start"
  );

  try {
    cron.stop();

    // mini delay para que no quede algo a mitad de log/tick
    await sleep(250);

    await db.end?.();
    log.info("[WORKER] db pool closed");
  } catch (err) {
    log.error({ err }, "[WORKER] shutdown error");
  } finally {
    log.warn(
      { signal, bootId, durationMs: Date.now() - bootStartedAt },
      "[WORKER] shutdown complete"
    );
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Opcional: no morir en silencio
process.on("unhandledRejection", (reason) => {
  log.fatal({ err: reason }, "[WORKER] unhandledRejection");
});

process.on("uncaughtException", (err) => {
  log.fatal({ err }, "[WORKER] uncaughtException");
  shutdown("uncaughtException").catch(() => process.exit(1));
});
