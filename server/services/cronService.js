// services/cronService.js
export function createCronService({
  db,
  mercadoPagoService,
  orderService,
  // tuning
  batchSize = 50,
}) {
  return {
    async runOnce() {
      const client = await db.connect();

      const stats = { processed: 0, extended: 0, paid: 0, released: 0 };

      try {
        await client.query("BEGIN");

        // Trae vencidas y las bloquea para que si tuvieras 2 instancias no las procesen ambas
        const orders = await orderService.getExpiredPendingForUpdate(
          batchSize,
          client
        );

        for (const order of orders) {
          stats.processed += 1;

          // 1) conseguir status MP
          let payment = null;

          if (order.payment_id) {
            payment = await mercadoPagoService.getPaymentById(order.payment_id);
          } else {
            // busca el pago más reciente por external_reference = orderId
            payment = await mercadoPagoService.findLatestPaymentByExternalReference(order.id);
          }

          const mpStatus = String(payment?.status || "").toLowerCase();

          // 2) decidir
          if (mpStatus === "approved") {
            const amount = payment.transaction_amount;
            const paymentId = String(payment.id);

            const { changed, paidOrder } = await orderService.handlePaymentApproved(order.id, paymentId, amount);

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
            continue; // nunca liberar tickets si PAID
          }

          if (mpStatus === "pending" || mpStatus === "in_process") {
            
            const paymentId = String(payment.id);
            console.log("Pending is: ", {
              orderId: order.id,
              paymentId
            })
            await orderService.addPendingPayment(order.id, paymentId, client);
            stats.extended += 1;
            continue;
          }

          if (["rejected", "cancelled", "expired"].includes(mpStatus)) {
            const reason =
              mpStatus === "expired" ? "EXPIRED" :
              mpStatus === "cancelled" ? "CANCELLED" :
              "ERROR";

            const changed = await orderService.handlePaymentFailedOrExpired(order.id, reason, client);
            if (changed === 1) {
              stats.released += 1;
            }
            continue;
          }

          // Si no hay pago (payment=null) o status desconocido:
          // expirá “normal” y liberá, porque no hay señales de pago en MP.
          const changed = await orderService.handlePaymentFailedOrExpired(order.id, "EXPIRED", client);
          if (changed === 1) {
            stats.released += 1;
          }
        }

        await client.query("COMMIT");
        return stats;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
  };
}
