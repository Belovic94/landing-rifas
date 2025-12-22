// services/cronService.js
export function createCronService({
  db,
  mercadoPagoService,
  orderService,
  mailService,
  // tuning
  batchSize = 50,
}) {
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
      const stats = { processed: 0, extended: 0, paid: 0, released: 0 };

      const orders = await withTx(async (client) => {
        return await orderService.getExpiredPendingForUpdate(batchSize, client);
      });

      for (const order of orders) {
        stats.processed += 1;

        // 1) MP (afuera de TX)
        let payment = null;
        try {
          if (order.payment_id) {
            payment = await mercadoPagoService.getPaymentById(order.payment_id);
          } else {
            payment = await mercadoPagoService.findLatestPaymentByExternalReference(order.id);
          }
        } catch (mpErr) {
          // Si MP falla, no mates el job: log y seguí con la próxima orden
          console.error("[CRON] Error consultando MP", {
            orderId: order.id,
            message: mpErr?.message,
            stack: mpErr?.stack,
          });
          continue;
        }

        const mpStatus = String(payment?.status || "").toLowerCase();

        if (mpStatus === "approved") {
          const amount = payment.transaction_amount;
          const paymentId = String(payment.id);

          const result = await withTx(async (client) => {
            return await orderService.handlePaymentApproved(order.id, paymentId, amount, client);
          });

          // si tu servicio devuelve { changed, paidOrder }
          const { changed, paidOrder } = result || {};
          if (changed === 1) {
            stats.paid += 1;
          }

          // 3) Mail (afuera de TX)
          if (changed === 1 && paidOrder) {
            try {
              await mailService.sendPurchaseEmail({
                to: paidOrder.email,
                numbers: paidOrder.tickets.filter(t => t.active).map(t => t.number),
                orderId: order.id,
                amount,
              });
            } catch (mailErr) {
              console.error("Error enviando email:", {
                message: mailErr?.message,
                code: mailErr?.code,
                errno: mailErr?.errno,
                syscall: mailErr?.syscall,
                host: mailErr?.host,
                port: mailErr?.port,
                response: mailErr?.response,
                stack: mailErr?.stack,
              });
            }
          }
          continue;
        }

        if (mpStatus === "pending" || mpStatus === "in_process") {
          const paymentId = payment?.id != null ? String(payment.id) : null;

          await withTx(async (client) => {
            await orderService.addPendingPayment(order.id, paymentId, client);
          });

          stats.extended += 1;
          continue;
        }

        if (["rejected", "cancelled", "expired"].includes(mpStatus)) {
          const reason =
            mpStatus === "expired" ? "EXPIRED" :
            mpStatus === "cancelled" ? "CANCELLED" :
            "ERROR";

          const changed = await withTx(async (client) => {
            return await orderService.handlePaymentFailedOrExpired(order.id, reason, client);
          });

          if (changed === 1) stats.released += 1;
          continue;
        }

        // status desconocido o sin pago => liberar
        const changed = await withTx(async (client) => {
          return await orderService.handlePaymentFailedOrExpired(order.id, "EXPIRED", client);
        });

        if (changed === 1) stats.released += 1;
      }

      return stats;
    },
  };
}
