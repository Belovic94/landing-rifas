import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

import { logger } from "./utils/logger.js";
import { getDb, initDatabase } from "./db.js";
import { createReservationRepository } from "./repositories/reservationRepository.js";
import { createOrderRepository } from "./repositories/orderRepository.js";
import { createOrderService } from "./services/orderService.js";
import { createMercadoPagoService } from "./services/mercadopagoService.js";
import { createApp } from "./app.js";
import { createMailService } from "./services/mailService.js";

const bootId = uuidv4();
const bootStartedAt = Date.now();
const log = logger.child({ bootId, component: "server" });

if (process.env.NODE_ENV !== "prod") {
  dotenv.config({ path: ".env.local" });
  log.info({ envFile: ".env.local" }, "[APP] dotenv loaded");
}

log.info(
  {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT || 3000,
    resetDb: process.env.RESET_DB === "true",
    mailMode: process.env.NODE_ENV === "prod" ? "sesApi" : (process.env.MAIL_MODE || "file"),
  },
  "[APP] boot start"
);

const db = getDb();

// Repos & Services
const reservationRepository = createReservationRepository(db);
const orderRepository = createOrderRepository(db);
const orderService = createOrderService(db, orderRepository, reservationRepository);

// MercadoPago (sin loguear accessToken)
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
      successUrl: process.env.MP_SUCCESS_URL || null,
      pendingUrl: process.env.MP_PENDING_URL || null,
      failureUrl: process.env.MP_FAILURE_URL || null,
      accessToken: process.env.ACCESS_TOKEN ? "set" : "missing",
    },
  },
  "[APP] MercadoPago service initialized"
);

// MailService
const mailMode =
  process.env.NODE_ENV === "prod" ? "sesApi" : process.env.MAIL_MODE || "file";
const mailService = createMailService({ mode: mailMode });

// DB init
const useReset = process.env.RESET_DB === "true";
try {
  await initDatabase(db, useReset);
} catch (err) {
  process.exit(1);
}

const app = createApp({ orderService, mercadoPagoService, mailService });

// Error handler (final)
app.use((err, req, res, next) => {
  const rlog = req?.log ? req.log : log;
  rlog.error({ err }, "[APP] unhandled request error");
  res.status(500).json({ error: "Ocurrió un error inesperado" });
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  log.info(
    { port: PORT, durationMs: Date.now() - bootStartedAt },
    "[APP] server listening"
  );
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  log.warn(
    { signal, uptimeMs: Date.now() - bootStartedAt },
    "[APP] shutdown start"
  );

  // Dejar de aceptar conexiones nuevas
  await new Promise((resolve) => {
    server.close(() => resolve());
    // safety: por si no hay conexiones, close llama igual
    setTimeout(resolve, 5_000);
  });

  try {
    await db.end?.();
    log.info("[APP] db pool closed");
  } catch (err) {
    log.error({ err }, "[APP] db pool close failed");
  } finally {
    log.warn(
      { signal, bootId, durationMs: Date.now() - bootStartedAt },
      "[APP] shutdown complete"
    );
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("unhandledRejection", (reason) => {
  log.fatal({ err: reason }, "[APP] unhandledRejection");
});

process.on("uncaughtException", (err) => {
  log.fatal({ err }, "[APP] uncaughtException");
  shutdown("uncaughtException").catch(() => process.exit(1));
});
