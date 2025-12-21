import { v4 as uuidv4 } from "uuid";

export function createOrderService(db, orderRepo, reservationRepo) {
  return {
    async createPreferenceFlow(ticketsAmount, email, expiresAt) {
      const orderId = uuidv4();
      const client = await db.connect();

      try {
        await client.query("BEGIN");

        await orderRepo.createOrder({ id: orderId, email, expiresAt }, client);

        const { ok, numbers }  = await reservationRepo.reserveRandomTickets(
          orderId,
          ticketsAmount,
          client
        );

        if (!ok) {
          // No hay stock suficiente → rollback para no dejar orden colgada
          await client.query("ROLLBACK");
          return { ok: false, error: "INSUFFICIENT_STOCK" };
        }

        await client.query("COMMIT");
        return { ok: true, orderId, numbers };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async onPreferenceCreateFailed(orderId) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await orderRepo.markStatusIfPending(orderId, "CANCELLED", client);
        await reservationRepo.releaseOrderTickets(orderId, "CANCELLED" , client);
        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async handlePaymentApproved(orderId, paymentId, amount) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");

        // idempotente: solo cambia si estaba PENDING
        const changed = await orderRepo.markPaid(orderId, paymentId, amount, client);

        const order = changed === 1
          ? await orderRepo.getOrder(orderId, client)
          : null;

        await client.query("COMMIT");

        return { changed, order };
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async handlePaymentFailedOrExpired(orderId, reason) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");

        // Solo si estaba PENDING
        const changed = await orderRepo.markStatusIfPending(orderId, reason, client);

        if (changed === 1) {
          await reservationRepo.releaseOrderTickets(orderId, reason, client);
        }

        await client.query("COMMIT");
        return changed;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },

    async addPendingPayment(orderId, paymentId, client) {
      return orderRepo.addPendingPayment(orderId, paymentId, client);
    },

    async getExpiredPendingForUpdate(limit, client) {
      return orderRepo.getExpiredPendingForUpdate(limit, client);
    },

    async getOrders() {
      return orderRepo.getAllOrders();
    }
  };
}
