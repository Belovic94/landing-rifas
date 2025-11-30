export function createOrderService(orderRepository, ticketRepository, db) {
  return {
    async createOrder(orderId, ticketIds, email) {
      await orderRepository.createOrder({ id: orderId, ticketIds, email });
    },

    async confirmOrderAndTickets(orderId, paymentId, amount) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');

        // 1) Actualizar orden
        const updatedOrder = await orderRepository.updateOrderPayment(
          orderId,
          paymentId,
          amount,
          client
        );

        if (!updatedOrder) {
          await client.query('ROLLBACK');
          return null;
        }

        // 2) Actualizar tickets
        const updatedTickets = await ticketRepository.confirmOrder(orderId, client);

        if (!updatedTickets) {
          await client.query('ROLLBACK');
          return null;
        }

        // 3) Traer orden completa (con números)
        const order = await orderRepository.getOrder(orderId, client);

        await client.query('COMMIT');
        return { order, updatedTickets };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },

    async getOrder(orderId) {
      return await orderRepository.getOrder(orderId);
    }
  };
}