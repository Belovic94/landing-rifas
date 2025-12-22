import { logger } from "../utils/logger.js";
import { v4 as uuidv4 } from "uuid";

export function createCronService({ db, mercadoPagoService, orderService, mailService, batchSize = 50 }) {
  async function withTx(fn) {
    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const res = await fn(client);
      await client.query("COMMIT");
      return res;
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      throw e;
    } finally {
      client.release();
    }
  }

  return {
    async runOnce() {
      const runId = uuidv4();
      const log = logger.child({ runId, job: "expire-orders" });
      const startedAt = Date.now();

      const stats = { processed: 0, extended: 0, paid: 0, released: 0 };

      log.info({ batchSize }, "[CRON-SERVICE] cron run started");

      let orders = [];
      try {
        orders = await withTx((client) => orderService.getExpiredPendingForUpdate(batchSize, client));
      } catch (e) {
        log.error({ err: e }, "[CRON-SERVICE] error fetching expired orders");
        throw e;
      }

      log.info({ count: orders.length }, "[CRON-SERVICE] orders fetched");

      for (const order of orders) {
        stats.processed += 1;

        const olog = log.child({ orderId: order.id, paymentId: order.payment_id ?? null });
        olog.info("[CRON-SERVICE] processing order");

        // MP afuera de TX
        let payment = null;
        try {
          payment = order.payment_id
            ? await mercadoPagoService.getPaymentById(order.payment_id)
            : await mercadoPagoService.findLatestPaymentByExternalReference(order.id);
        } catch (mpErr) {
          olog.error({ err: mpErr }, "[CRON-SERVICE] MercadoPago error");
          continue;
        }

        const mpStatus = String(payment?.status || "").toLowerCase();
        olog.info(
          { mpStatus, mpPaymentId: payment?.id ?? null, amount: payment?.transaction_amount ?? null },
          "[CRON-SERVICE] MP status resolved"
        );

        if (mpStatus === "approved") {
          const amount = payment.transaction_amount;
          const paymentId = String(payment.id);

          const result = await withTx((client) =>
            orderService.handlePaymentApproved(order.id, paymentId, amount, client)
          );

          const { changed, paidOrder } = result || {};
          if (changed === 1) stats.paid += 1;

          olog.info({ changed, amount, paymentId }, "[CRON-SERVICE] payment approved handled");

          if (changed === 1 && paidOrder) {
            try {
              await mailService.sendPurchaseEmail({
                to: paidOrder.email,
                numbers: paidOrder.tickets.filter(t => t.active).map(t => t.number),
                orderId: order.id,
                amount,
              });
              olog.info({ to: paidOrder.email }, "[CRON-SERVICE] purchase email sent");
            } catch (mailErr) {
              olog.error({ err: mailErr }, "[CRON-SERVICE] email send failed");
            }
          }
          continue;
        }

        if (mpStatus === "pending" || mpStatus === "in_process") {
          const paymentId = payment?.id != null ? String(payment.id) : null;

          await withTx((client) => orderService.addPendingPayment(order.id, paymentId, client));
          stats.extended += 1;

          olog.info({ paymentId }, "[CRON-SERVICE] payment pending, order extended");
          continue;
        }

        if (["rejected", "cancelled", "expired"].includes(mpStatus)) {
          const reason =
            mpStatus === "expired" ? "EXPIRED" :
            mpStatus === "cancelled" ? "CANCELLED" :
            "ERROR";

          const changed = await withTx((client) =>
            orderService.handlePaymentFailedOrExpired(order.id, reason, client)
          );

          if (changed === 1) stats.released += 1;

          olog.warn({ reason, changed }, "[CRON-SERVICE] payment failed, order released");
          continue;
        }

        const changed = await withTx((client) =>
          orderService.handlePaymentFailedOrExpired(order.id, "EXPIRED", client)
        );

        if (changed === 1) stats.released += 1;
        olog.warn({ mpStatus, changed }, "[CRON-SERVICE] unknown MP status, order released");
      }

      log.info({ durationMs: Date.now() - startedAt, stats }, "[CRON-SERVICE] cron run finished");
      return stats;
    },
  };
}
