export function createTicketService(ticketRepository, db) {
  return {
    async blockTickets(quantity, orderId) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");

        const tickets = await ticketRepository.getAvailableTickets(quantity, client);

        if (tickets.length === 0) {
          await client.query("ROLLBACK");
          return { error: "No hay tickets disponibles" };
        }

        const ids = tickets.map((t) => t.id);

        await ticketRepository.blockTickets(ids, orderId, client);

        await client.query("COMMIT");
        return { tickets };
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },

    async confirmOrder(orderId) {
      const updated = await ticketRepository.confirmOrder(orderId);
      return { updated };
    },

    async releaseOrder(orderId) {
      const released = await ticketRepository.releaseOrder(orderId);
      return { released };
    },
  };
}
