import express from "express";
import cors from "cors";
import { createExpirationDate, getTicketPrice } from "./utils.js";
import { logger } from "./utils/logger.js"
import { requireAuth, requireRole } from "./middlewares/auth.js";

const ALLOWED_ORIGINS = [
  "https://bono2026.fameargentina.org.ar",
  "http://localhost:5173",
];

function corsMiddleware() {
  return cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });
}

// middleware: agrega reqId + logger por request
function requestLogger() {
  return (req, res, next) => {
    const reqId = req.headers["x-request-id"] || crypto.randomUUID();
    req.reqId = String(reqId);

    const start = Date.now();

    req.log = logger.child({
      reqId: req.reqId,
      method: req.method,
      path: req.path,
      origin: req.headers.origin || null,
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
    });

    req.log.info("[APP] request start");

    res.on("finish", () => {
      req.log.info(
        {
          statusCode: res.statusCode,
          durationMs: Date.now() - start,
        },
        "[APP] request end"
      );
    });

    next();
  };
}

export function createApp({ orderService, mercadoPagoService, mailService, authService }) {
  const app = express();

  app.use(corsMiddleware());
  app.use(express.json());
  app.use(requestLogger());

  app.post("/create-preference", async (req, res) => {
    const startedAt = Date.now();
    const { amount, email } = req.body;

    req.log.info({ amount, email }, "[PREFERENCE] start creating preference");

    if (!amount || isNaN(amount)) {
      req.log.warn({ amount }, "[PREFERENCE] bad request invalid or missing amount");
      return res.status(400).json({ error: "amount inválido o faltante" });
    }

    const ticketsAmount = Number(amount);

    try {
      const expiresAt = createExpirationDate(
        Number(process.env.EXPIRE_PREFERENCE_MIN || 60)
      );

      const result = await orderService.createPreferenceFlow(
        ticketsAmount,
        email,
        expiresAt
      );

      if (!result.ok && result.error === "INSUFFICIENT_STOCK") {
        req.log.warn(
          { ticketsAmount, durationMs: Date.now() - startedAt },
          "[PREFERENCE] cannot create preference due to stock"
        );
        return res.status(409).json({ error: "No hay suficientes rifas disponibles" });
      }

      const { orderId, numbers } = result;

      req.log.info(
        { orderId, numbersCount: numbers?.length ?? 0 },
        "[PREFERENCE] tickets blocked for preference"
      );

      try {
        const unitPrice = getTicketPrice(ticketsAmount);
        const totalPrice = unitPrice * ticketsAmount;

        const mpPref = await mercadoPagoService.createPreference({
          orderId,
          ticketsAmount,
          totalPrice,
          expirationDateTo: expiresAt,
        });

        req.log.info(
          {
            orderId,
            initPoint: mpPref.init_point,
            durationMs: Date.now() - startedAt,
          },
          "[PREFERENCE] create preference completed success"
        );

        return res.status(200).json({ init_point: mpPref.init_point });
      } catch (mpErr) {
        // si MP falla: liberar reserva + cancelar order
        try {
          await orderService.onPreferenceCreateFailed(orderId);
          req.log.warn({ orderId }, "[PREFERENCE] rollback when creating preference");
        } catch (rollbackErr) {
          req.log.error({ err: rollbackErr, orderId }, "[PREFERENCE] rollback failed");
        }

        req.log.error(
          { err: mpErr, orderId, durationMs: Date.now() - startedAt },
          "[PREFERENCE] MercadoPago error when creating"
        );

        return res.status(500).send("Error");
      }
    } catch (err) {
      req.log.error(
        { err, durationMs: Date.now() - startedAt },
        "[PREFERENCE] generic error when creating"
      );
      return res.status(500).json({ error: "Error al reservar rifas" });
    }
  });

  app.post("/webhook", async (req, res) => {
    const startedAt = Date.now();

    const type = req.body?.type || req.query?.type || req.query?.topic;
    const paymentId =
      req.body?.data?.id || req.query?.["data.id"] || req.query?.id;

    // Para webhooks, es útil dejar trazado aunque no sea payment
    req.log.info({ type, paymentId }, "[WEBHOOK] WEBHOOK_RECEIVED");

    if (type !== "payment" || !paymentId) {
      req.log.info({ type, paymentId }, "[WEBHOOK] WEBHOOK_IGNORED");
      return res.sendStatus(200);
    }

    try {
      const payment = await mercadoPagoService.getPaymentById(paymentId);
      const orderId = payment?.external_reference;
      const status = String(payment?.status || "").toLowerCase();

      if (!orderId) {
        req.log.warn({ paymentId, status }, "[WEBHOOK] WEBHOOK_NO_ORDER_ID");
        return res.sendStatus(200);
      }

      const wlog = req.log.child({ orderId, paymentId, mpStatus: status });

      if (status === "approved") {
        const amount = payment.transaction_amount;
        const orderPaymentId = payment.id;

        const { changed, order } = await orderService.handlePaymentApproved(
          orderId,
          orderPaymentId,
          amount
        );

        wlog.info({ changed, amount }, "[WEBHOOK] WEBHOOK_APPROVED_HANDLED");

        if (changed === 1 && order) {
          try {
            await mailService.sendPurchaseEmail({
              to: order.email,
              numbers: order.tickets.filter((t) => t.active).map((t) => t.number),
              orderId,
              amount,
            });
            wlog.info({ to: order.email }, "[WEBHOOK] WEBHOOK_MAIL_SENT");
          } catch (mailErr) {
            wlog.error({ err: mailErr }, "[WEBHOOK] WEBHOOK_MAIL_FAILED");
          }
        }
      }

      if (["rejected", "cancelled", "expired"].includes(status)) {
        const reason =
          status === "expired" ? "EXPIRED" :
          status === "cancelled" ? "CANCELLED" :
          "ERROR";

        await orderService.handlePaymentFailedOrExpired(orderId, reason);
        wlog.warn({ reason }, "[WEBHOOK] WEBHOOK_PAYMENT_FAILED_HANDLED");
      }

      req.log.info(
        { durationMs: Date.now() - startedAt, orderId },
        "WEBHOOK_DONE"
      );

      return res.sendStatus(200);
    } catch (err) {
      req.log.error(
        { err, durationMs: Date.now() - startedAt },
        "[WEBHOOK] WEBHOOK_ERROR"
      );
      return res.sendStatus(err.status || 500);
    }
  });

  app.get("/health-check", (req, res) => {
    req.log.info("HEALTHCHECK");
    res.send("ok");
  });

  app.get("/admin/orders", requireAuth, requireRole("admin"), async (req, res) => {
    try {
      const orders = await orderService.getOrders();
      req.log.info({ total: orders.length }, "[ADMIN] ADMIN_ORDERS_OK");
      return res.status(200).json({
        ok: true,
        total: orders.length,
        items: orders,
      });
    } catch (err) {
      req.log.error({ err }, "[ADMIN] ADMIN_ORDERS_ERROR");
      return res.status(500).json({
        ok: false,
        error: "INTERNAL_ERROR",
      });
    }
  });

  app.get("/admin/stats", requireAuth, requireRole("admin", "viewer"), async (req, res) => {
   try{
    const stats = await orderService.getStats();
    req.log.info({ total: orders.length }, "[ADMIN] STATS_OK");
    return res.status(200).json({ stats });
   } catch (err) {
    req.log.error({ err }, "[ADMIN] STATS_ERROR");
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
    });
  }
    
  });

  app.post("/auth/login", async (req, res) => {
    const { username, password } = req.body || {};

    const result = await authService.login(username, password);

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ token: result.token, user: result.user });
  });

  return app;
}
