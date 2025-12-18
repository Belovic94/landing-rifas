import dotenv from "dotenv";

import { getDb, initDatabase } from "./db.js";
import { createReservationRepository } from "./repositories/reservationRepository.js";
import { createOrderRepository } from "./repositories/orderRepository.js";
import { createMercadoPagoService } from "./services/mercadopagoService.js";
import { createOrderService } from "./services/orderService.js";
import { createCronService } from "./services/cronService.js";
import { createExpireOrdersCron } from "./cron/expireOrderCron.js";

// Solo cargar .env.local en dev
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: ".env.local" });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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


await initDatabase(db, false);

const cronService = createCronService({
  db,
  mercadoPagoService,
  orderService,
  batchSize: Number(process.env.CRON_BATCH_SIZE || 50),
});

const cron = createExpireOrdersCron({
  cronService,
  intervalMin: Number(process.env.EXPIRE_CRON_MINUTE || 90),
});

async function shutdown(signal) {
  console.log(`[WORKER] shutdown signal=${signal}`);
  try {
    cron.stop();
    await sleep(250);
    await db.end?.();
  } catch (e) {
    console.error("[WORKER] shutdown error:", e);
  } finally {
    process.exit(0);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

console.log("[WORKER] starting cron loop…");
cron.start();
