// components/TicketLookupPanel.jsx
import { useMemo, useState } from "preact/hooks";
import { fetchJson } from "../utils/api";

const TICKET_RE = /^\d{4}$/;

function parseTickets(input) {
  // separa por coma, espacios o saltos de línea
  const parts = String(input || "")
    .split(/[\s,;]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => String(s).padStart(4, "0"));

  // unique preservando orden
  const seen = new Set();
  const unique = [];
  for (const t of parts) {
    if (!seen.has(t)) {
      seen.add(t);
      unique.push(t);
    }
  }

  const invalid = unique.filter((t) => !TICKET_RE.test(t));
  return { tickets: unique, invalid };
}

const TicketStateUI = {
  AVAILABLE: {
    label: "Disponible",
    class: "bg-fame-soft/20 text-fame-black border-fame-black/10",
  },
  PAID: {
    label: "Pagado",
    class: "bg-fame-green/15 text-fame-green-dark border-fame-green/30",
  },
  PENDING: {
    label: "Pendiente",
    class: "bg-fame-accent/20 text-fame-black border-fame-accent/35",
  },
  SHOULD_BE_RELEASED: {
    label: "Liberar",
    class: "bg-fame-danger/15 text-fame-black border-fame-danger/25",
  },
  NOT_FOUND: {
    label: "No existe",
    class: "bg-fame-danger/10 text-fame-black border-fame-danger/20",
  },
  UNKNOWN: {
    label: "Desconocido",
    class: "bg-fame-soft/20 text-fame-black border-fame-black/10",
  },
};

export function TicketLookupPanel({ token }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const parsed = useMemo(() => parseTickets(text), [text]);

  async function onSubmit(e) {
    e?.preventDefault?.();
    setError(null);
    setResult(null);

    if (parsed.tickets.length === 0) {
      setError("Pegá al menos 1 ticket (4 dígitos).");
      return;
    }
    if (parsed.invalid.length) {
      setError(`Tickets inválidos: ${parsed.invalid.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      const data = await fetchJson(
        "/admin/tickets/status",
        token,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tickets: parsed.tickets }),
        }
      );

      if (!data) return;
      if (!data.ok) {
        setError(data.error || "No se pudo consultar tickets");
        return;
      }

      setResult(data);
    } catch (err) {
      setError(err?.message || "Error consultando tickets");
    } finally {
      setSubmitting(false);
    }
  }

  const items = result?.items ?? [];
  const summary = result?.summary ?? null;

  return (
    <div class="rounded-2xl bg-white shadow-sm ring-1 ring-fame-black/10 overflow-hidden">

      {/* TOP (fijo): header + form + summary */}
      <div class="shrink-0 p-5 border-b border-fame-black/10 bg-white/90 backdrop-blur">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h3 class="text-lg font-extrabold text-fame-black">Consultar tickets</h3>
            <p class="text-sm text-fame-black/70 mt-1">
              Pegá 1 o varios tickets (separados por coma, espacio o salto de línea).
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setText("");
              setResult(null);
              setError(null);
            }}
            class="shrink-0 rounded-xl px-3 py-2 text-sm ring-1 ring-fame-black/10 hover:bg-fame-soft/20"
          >
            Limpiar
          </button>
        </div>

        <form onSubmit={onSubmit} class="mt-4 space-y-3">
          <textarea
            class="w-full min-h-[110px] rounded-2xl border border-fame-black/10 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-fame-accent/40"
            placeholder={"Ej:\n0324, 6965\n7176 8002\n0903"}
            value={text}
            onInput={(e) => setText(e.target.value)}
          />

          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="text-xs text-fame-black/70">
              Detectados: <span class="font-semibold">{parsed.tickets.length}</span>
              {parsed.invalid.length > 0 && (
                <span class="ml-2 text-fame-danger font-semibold">
                  ({parsed.invalid.length} inválidos)
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              class={`rounded-2xl px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-fame-black/10
                ${submitting ? "opacity-60 cursor-not-allowed" : "hover:bg-fame-accent/20"}`}
            >
              {submitting ? "Consultando…" : "Consultar"}
            </button>
          </div>

          {error && (
            <div class="rounded-2xl bg-fame-danger/10 ring-1 ring-fame-danger/20 px-4 py-3 text-sm text-fame-black">
              {error}
            </div>
          )}
        </form>

        {/* Summary (fijo arriba) */}
        {summary && (
          <div class="mt-5 grid grid-cols-2 md:grid-cols-3 gap-3">
            <div class="rounded-2xl bg-fame-green/10 ring-1 ring-fame-green/20 p-3">
              <div class="text-xs text-fame-black/60">Vendidos</div>
              <div class="text-lg font-extrabold text-fame-black">{summary.sold ?? 0}</div>
            </div>
            <div class="rounded-2xl bg-fame-accent/10 ring-1 ring-fame-accent/20 p-3">
              <div class="text-xs text-fame-black/60">Pendientes</div>
              <div class="text-lg font-extrabold text-fame-black">{summary.PENDING ?? 0}</div>
            </div>
            <div class="rounded-2xl bg-fame-soft/20 ring-1 ring-fame-black/10 p-3">
              <div class="text-xs text-fame-black/60">Disponibles</div>
              <div class="text-lg font-extrabold text-fame-black">{summary.AVAILABLE ?? 0}</div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM (scroll): resultados */}
      <div class="p-5 border-t border-fame-black/10 max-h-[300px] overflow-y-auto">
        {items.length > 0 ? (
          <div class="space-y-3">
            {items.map((it) => {
              const ticketState = TicketStateUI[it.state] ?? TicketStateUI.UNKNOWN;

              return (
                <div
                  key={it.ticket}
                  class="rounded-2xl bg-white ring-1 ring-fame-black/10 overflow-hidden"
                >
                  {/* HEADER: TICKET */}
                  <div class="px-4 py-2 bg-fame-soft/20 border-b border-fame-black/10 flex items-center gap-2 justify-center">
                    <div class="text-xs text-fame-black/60">Ticket</div>
                    <div class="font-mono font-extrabold text-fame-black">
                      {it.ticket}
                    </div>
                  </div>

                  {/* BODY */}
                  <div class="px-4 py-3">
                    <div class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-start">
                      <div class="min-w-0">
                        <div class="text-sm font-semibold text-fame-black truncate">
                          {it.order?.email ?? "— sin orden —"}
                        </div>

                        <div class="mt-0.5 text-xs text-fame-black/60 font-mono break-all">
                          {it.order?.id ? `Order ${it.order.id}` : "Sin orden asociada"}
                        </div>
                      </div>

                      <div class="sm:text-right">
                        <span
                          class={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${ticketState.class}`}
                        >
                          {ticketState.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : result ? (
          <div class="text-sm text-fame-black/70">
            No se encontraron resultados.
          </div>
        ) : (
          <div class="text-sm text-fame-black/50">
            Pegá tickets y tocá “Consultar”.
          </div>
        )}
      </div>
    </div>
  );
}
