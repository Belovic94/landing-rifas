export function createReservationRepository(db) {
  const getExecutor = (client) => client || db;

  return {
    /**
     * Reserva N tickets al azar para una order.
     * - Concurrencia safe: FOR UPDATE SKIP LOCKED
     * - No “falla”: si no hay suficientes, devuelve ok=false
     * - Deja historial en order_tickets
     */
    async reserveRandomTickets(orderId, quantity, client) {
      const executor = getExecutor(client);

      const { rows } = await executor.query(
        `
        WITH candidates AS (
          SELECT t.number
          FROM tickets t
          WHERE NOT EXISTS (
            SELECT 1
            FROM order_tickets ot
            WHERE ot.ticket_number = t.number
              AND ot.released_at IS NULL
          )
          ORDER BY random()
          LIMIT $2
          FOR UPDATE SKIP LOCKED
        ),
        inserted AS (
          INSERT INTO order_tickets (order_id, ticket_number)
          SELECT $1, c.number
          FROM candidates c
          RETURNING ticket_number
        )
        SELECT ticket_number
        FROM inserted
        ORDER BY ticket_number;
        `,
        [orderId, quantity]
      );

      const numbers = rows.map(r => r.ticket_number.trim());
      return { ok: numbers.length === quantity, numbers };
    },

    /**
     * Libera tickets activos de una order, dejando historial.
     * - reason: 'EXPIRED' | 'ERROR' | 'CANCELLED' | 'PENDING'
     */
    async releaseOrderTickets(orderId, reason = "EXPIRED", client) {
			const executor = getExecutor(client);

			const { rowCount } = await executor.query(
				`
				UPDATE order_tickets ot
				SET released_at = NOW(), release_reason = $2
				WHERE ot.order_id = $1
					AND ot.released_at IS NULL
					AND EXISTS (
						SELECT 1 FROM orders o
						WHERE o.id = ot.order_id
							AND o.status IN ('PENDING','EXPIRED','ERROR','CANCELLED')
					)
				`,
				[orderId, reason]
			);

			return rowCount;
		},

    async getPaidAmountTotal(client) {
      const executor = getExecutor(client);
      const { rows } = await executor.query(`
        SELECT COALESCE(SUM(amount), 0)::bigint AS total
        FROM orders
        WHERE status = 'PAID'
      `);
      return Number(rows[0].total);
    },

    async getTicketsSold(client) {
      const executor = getExecutor(client);
      const { rows } = await executor.query(`
        SELECT COUNT(*)::int AS tickets_sold
        FROM order_tickets ot
        JOIN orders o ON o.id = ot.order_id
        WHERE o.status = 'PAID'
          AND ot.released_at IS NULL
      `);
      return rows[0].tickets_sold;
    },

    async getTicketsPending(client) {
      const executor = getExecutor(client);
      const { rows } = await executor.query(`
        SELECT COUNT(*)::int AS tickets_pending
        FROM order_tickets ot
        JOIN orders o ON o.id = ot.order_id
        WHERE o.status = 'PENDING'
          AND ot.released_at IS NULL
      `);
      return rows[0].tickets_pending;
    },

    async getSalesByPack(client) {
      const executor = getExecutor(client);
      const { rows } = await executor.query(`
        WITH paid_orders AS (
          SELECT o.id
          FROM orders o
          WHERE o.status = 'PAID'
        ),
        qty_per_order AS (
          SELECT
            ot.order_id,
            COUNT(*) FILTER (WHERE ot.released_at IS NULL)::int AS qty
          FROM order_tickets ot
          JOIN paid_orders po ON po.id = ot.order_id
          GROUP BY ot.order_id
        )
        SELECT qty, COUNT(*)::int AS count
        FROM qty_per_order
        WHERE qty IN (1,3,5,10,20)
        GROUP BY qty
        ORDER BY qty;
      `);

      const packs = { "1": 0, "3": 0, "5": 0, "10": 0, "20": 0 };
      for (const r of rows) packs[String(r.qty)] = r.count;
      return packs;
    },

    async getTicketsStatus(ticketNumbers, client) {
      const executor = getExecutor(client);

      const { rows } = await executor.query(
        `
        SELECT
          t.number AS ticket_number,

          -- si hay reserva activa, estos campos existen
          o.id AS order_id,
          o.status AS order_status,
          o.email,
          o.amount,
          o.created_at,
          o.expires_at
        FROM tickets t
        LEFT JOIN order_tickets ot
          ON ot.ticket_number = t.number
        AND ot.released_at IS NULL
        LEFT JOIN orders o
          ON o.id = ot.order_id
        WHERE t.number = ANY($1::text[])
        `,
        [ticketNumbers]
      );

      // Nota: si te pasan un ticket que NO existe en tickets, no aparece acá.
      return rows;
    },
	}
}