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
			const executor = client || db;

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
		}
	}
}