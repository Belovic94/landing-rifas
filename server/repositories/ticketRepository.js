
export function createTicketRepository(db) {
  return {
    async getAvailableTickets(quantity, client) {
      const executor = client || db;
      const { rows } = await executor.query(
        `SELECT id, number
         FROM tickets
         WHERE status = 'AVAILABLE'
         ORDER BY random()
         LIMIT $1
         FOR UPDATE SKIP LOCKED`,
        [quantity]
      );
      return rows;
    },

    async blockTickets(ids, orderId, client) {
      const executor = client || db;
      await executor.query(
        `UPDATE tickets
         SET status = 'BLOCKED', order_id = $2
         WHERE id = ANY($1::int[])`,
        [ids, orderId]
      );
    },

    async confirmOrder(orderId) {
      const { rowCount } = await db.query(
        `UPDATE tickets
         SET status = 'SOLD'
         WHERE order_id = $1 AND status = 'BLOCKED'`,
        [orderId]
      );
      return rowCount;
    },

    async releaseOrder(orderId) {
      const { rowCount } = await db.query(
        `UPDATE tickets
         SET status = 'AVAILABLE', order_id = NULL
         WHERE order_id = $1 AND status = 'BLOCKED'`,
        [orderId]
      );
      return rowCount;
    },
  };
}
