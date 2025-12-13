import dotenv from 'dotenv';

import { getDb, initDatabase } from "./db.js";
import { createOrderRepository } from "./repositories/orderRepository.js";
import { createOrderService } from "./services/orderService.js";
import { createMercadoPagoService } from './services/mercadopagoService.js';
import { createApp } from './app.js';
import { createMailService } from './services/mailService.js';

dotenv.config({ path: '.env.local' }); 

const db = getDb();

// Orders
const orderRepository = createOrderRepository(db);
const orderService = createOrderService(orderRepository, ticketRepository, db);

// MercadoPago
const mercadoPagoService = createMercadoPagoService({
  webhookUrl: process.env.WEBHOOK_URL,
  successUrl: process.env.MP_SUCCESS_URL,
  pendingUrl: process.env.MP_PENDING_URL,
  failureUrl: process.env.MP_FAILURE_URL,
});

// MailService
const mailService = createMailService({
  mode: process.env.NODE_ENV === "production" ? "smtp" : "ethereal"
});

const useReset = process.env.RESET_DB === "true";
await initDatabase(db, useReset);

const app = createApp({ orderService, mercadoPagoService, mailService });

const cronService = createCronService({
  db,
  orderRepo,
  reservationRepo,
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
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
  cron.start();
});

// shutdown prolijo
process.on("SIGINT", async () => {
  cron.stop();
  await db.end?.();
  process.exit(0);
});