// services/ticketService.js
export function createTicketService(reservationRepo) {
  const normalize = (t) => String(t ?? "").trim().padStart(4, "0");

  const TicketState = Object.freeze({
    AVAILABLE: "AVAILABLE",          // existe, no reservado
    PAID: "PAID",                    // vendido
    PENDING: "PENDING",              // reservado, no pago
    SHOULD_BE_RELEASED: "SHOULD_BE_RELEASED", // inconsistencia
    NOT_FOUND: "NOT_FOUND",          // no existe en catálogo
    UNKNOWN: "UNKNOWN",
  });

  function normalizeAndValidate(input) {
    const arr = Array.isArray(input) ? input : [input];
    const normalized = arr.map(normalize).filter(Boolean);

    const unique = Array.from(new Set(normalized));
    const invalid = unique.filter((x) => !/^\d{4}$/.test(x));

    if (invalid.length) return { ok: false, error: "INVALID_TICKETS", invalid };
    if (unique.length === 0) return { ok: false, error: "EMPTY_TICKETS" };
    if (unique.length > 500) return { ok: false, error: "TOO_MANY_TICKETS" };

    return { ok: true, tickets: unique };
  }

  function mapRow(row) {
    // row siempre existe para tickets válidos en catálogo (porque viene de tickets t)
    // si no hay order_id => no está reservado activo
    if (!row.order_id) {
      return {
        exists: true,
        state: TicketState.AVAILABLE,
        sold: false,
        order: null,
      };
    }

    const status = String(row.order_status || "").toUpperCase();
    const sold = status === "PAID";

    let state;
    switch (status) {
      case "PAID":
        state = TicketState.PAID;
        break;
      case "PENDING":
        state = TicketState.PENDING;
        break;
      case "EXPIRED":
      case "ERROR":
      case "CANCELLED":
        state = TicketState.SHOULD_BE_RELEASED;
        break;
      default:
        state = TicketState.UNKNOWN;
    }

    return {
      exists: true,
      state,
      sold,
      order: {
        id: row.order_id,
        status,
        email: row.email,
        amount: row.amount != null ? Number(row.amount) : null,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      },
    };
  }

  return {
    async getTicketsStatus(inputTickets, { client } = {}) {
      const norm = normalizeAndValidate(inputTickets);
      if (!norm.ok) return norm;

      const rows = await reservationRepo.getTicketsStatus(norm.tickets, client);

      const byTicket = new Map(rows.map((r) => [String(r.ticket_number).trim(), r]));

      const items = norm.tickets.map((t) => {
        const row = byTicket.get(t);

        // si no está en catálogo
        if (!row) {
          return { ticket: t, exists: false, state: TicketState.NOT_FOUND, sold: false, order: null };
        }

        return { ticket: t, ...mapRow(row) };
      });

      const summary = items.reduce(
        (acc, it) => {
          acc.total++;
          acc[it.state] = (acc[it.state] || 0) + 1;
          if (it.sold) acc.sold++;
          return acc;
        },
        { total: 0, sold: 0 }
      );

      return { ok: true, summary, items };
    },
  };
}
