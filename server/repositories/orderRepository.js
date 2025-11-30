export function createOrderRepository(db) {
  const getExecutor = (client) => client || db;

  return {
    async createOrder(order, client) {
      const executor = getExecutor(client);
      const { id, ticketIds, email } = order;
      await executor.query(
        `INSERT INTO orders (id, status, ticket_ids, email)
         VALUES ($1, 'PENDING', $2, $3)`,
        [id, ticketIds, email]
      );
    },

    async updateOrderPayment(orderId, paymentId, amount, client) {
      const executor = getExecutor(client);
      const { rowCount } = await executor.query(
        `UPDATE orders
         SET status = 'SOLD', amount = $2, payment_id = $3
         WHERE id = $1 AND status = 'PENDING'`,
        [orderId, amount, paymentId]
      );
      return rowCount;
    },

    async getOrder(orderId, client) {
      const executor = getExecutor(client);
      const { rows } = await executor.query(
        `SELECT o.id, o.status, o.ticket_ids, o.email, o.amount, o.payment_id, o.created_at,
                t.number AS ticket_number
         FROM orders o
         JOIN tickets t ON t.id = ANY(o.ticket_ids)
         WHERE o.id = $1`,
        [orderId]
      );

      if (!rows.length) return null;

      return {
        id: rows[0].id,
        status: rows[0].status,
        numbers: rows.map((r) => r.ticket_number),
        email: rows[0].email,
        amount: rows[0].amount,
        paymentId: rows[0].payment_id,
        createdAt: rows[0].created_at,
      };
    },
  };
}
