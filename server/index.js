import dotenv from 'dotenv';

import { getDb, initDatabase } from "./db.js";
import { createReservationRepository } from './repositories/reservationRepository.js';
import { createOrderRepository } from "./repositories/orderRepository.js";
import { createOrderService } from "./services/orderService.js";
import { createMercadoPagoService } from './services/mercadopagoService.js';
import { createApp } from './app.js';
import { createMailService } from './services/mailService.js';
import { createCronService } from './services/cronService.js';
import { createExpireOrdersCron } from './cron/expireOrderCron.js'

if (process.env.NODE_ENV !== "prod") {
  dotenv.config({ path: ".env.local" });
}

const db = getDb();

// Orders
const reservationRepository = createReservationRepository(db);
const orderRepository = createOrderRepository(db);
const orderService = createOrderService(db, orderRepository, reservationRepository);

// MercadoPago
const mercadoPagoService = createMercadoPagoService({
  accessToken: process.env.ACCESS_TOKEN,
  webhookUrl: process.env.WEBHOOK_URL,
  successUrl: process.env.MP_SUCCESS_URL,
  pendingUrl: process.env.MP_PENDING_URL,
  failureUrl: process.env.MP_FAILURE_URL,
});

// MailService
const mailService = createMailService({ mode: process.env.NODE_ENV === "prod" ? "smtp" : process.env.MAIL_MODE || "file" });

const useReset = process.env.RESET_DB === "true";
await initDatabase(db, useReset);

const app = createApp({ orderService, mercadoPagoService, mailService });

const cronService = createCronService({
  db,
  orderRepository,
  reservationRepository,
  mercadoPagoService,
  batchSize: Number(process.env.CRON_BATCH_SIZE || 50),
});

const cron = createExpireOrdersCron({
  cronService,
  intervalMin: Number(process.env.EXPIRE_CRON_MINUTE || 90),
});

app.use((err, req, res, next) => {
  console.error("Error en request:", err);
  res.status(500).json({ error: "Ocurrió un error inesperado" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on ${PORT}`);
  cron.start();
});

// shutdown prolijo
process.on("SIGINT", async () => {
  cron.stop();
  await db.end?.();
  process.exit(0);
});