export function createOrderRepository(db) {
  const getExecutor = (client) => client || db;

  return {
    async createOrder({ id, email, expiresAt }, client) {
      const executor = getExecutor(client);
      await executor.query(
        `INSERT INTO orders (id, status, email, expires_at)
         VALUES ($1, 'PENDING', $2, $3)`,
        [id, email, expiresAt]
      );
    },

    async getExpiredPendingForUpdate(limit, client) {
      const executor = getExecutor(client);
      const { rows } = await executor.query(
        `
        SELECT id, payment_id, expires_at
        FROM orders
        WHERE status = 'PENDING'
          AND expires_at <= NOW()
        ORDER BY expires_at
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        `,
        [limit]
      );
      return rows;
    },

    async markPaid(orderId, paymentId, amount, client) {
      const executor = getExecutor(client);
      const { rowCount } = await executor.query(
        `UPDATE orders
         SET status = 'PAID',
             amount = $2,
             payment_id = $3,
             updated_at = NOW()
         WHERE id = $1 AND status = 'PENDING'`,
        [orderId, amount, paymentId]
      );
      return rowCount;
    },

    async addPendingPayment(orderId, paymentId, client) {
      const executor = getExecutor(client);
      const { rowCount } = await executor.query(
        `
        UPDATE orders
        SET payment_id = COALESCE(payment_id, $2),
            updated_at = NOW()
        WHERE id = $1 AND status = 'PENDING'
        `,
        [orderId, paymentId]
      );
      return rowCount;
    },

    async markStatusIfPending(orderId, newStatus, client) {
      const executor = getExecutor(client);

      const { rowCount } = await executor.query(
        `
        UPDATE orders
        SET status = $2,
            updated_at = NOW()
        WHERE id = $1
          AND status = 'PENDING'
        `,
        [orderId, newStatus]
      );

      return rowCount;
    },

    // Trae order + tickets (activos e históricos)
    async getOrder(orderId, client) {
      const executor = getExecutor(client);

      const { rows } = await executor.query(
        `
        SELECT
          o.id, o.status, o.email, o.amount, o.payment_id, o.created_at, o.expires_at,
          ot.ticket_number, ot.assigned_at, ot.released_at, ot.release_reason
        FROM orders o
        LEFT JOIN order_tickets ot
          ON ot.order_id = o.id
        WHERE o.id = $1
        ORDER BY ot.assigned_at ASC, ot.ticket_number ASC
        `,
        [orderId]
      );

      if (!rows.length) return null;

      return {
        id: rows[0].id,
        status: rows[0].status,
        email: rows[0].email,
        amount: rows[0].amount,
        paymentId: rows[0].payment_id,
        createdAt: rows[0].created_at,
        expiresAt: rows[0].expires_at,
        tickets: rows
          .filter(r => r.ticket_number)
          .map(r => ({
            number: r.ticket_number.trim(),
            assignedAt: r.assigned_at,
            releasedAt: r.released_at,
            releaseReason: r.release_reason,
            active: r.released_at == null,
          })),
      };
    },

    async findExpiredOrders(client) {
      const executor = getExecutor(client);
      const { rows } = await executor.query(
        `
        SELECT id
        FROM orders
        WHERE status = 'PENDING'
          AND expires_at <= NOW()
        ORDER BY expires_at ASC
        `
      );
      return rows.map(r => r.id);
    }
  };
}
