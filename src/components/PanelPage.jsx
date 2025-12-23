import { useEffect, useMemo, useState } from "preact/hooks";
import { getSession, clearSession } from "../utils/auth";
import {
  BanknotesIcon,
  TicketIcon,
  ClockIcon,
  Squares2X2Icon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const API_BASE = import.meta.env.VITE_API_BASE;

function formatARS(n) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
}

function toMs(d) {
  const ms = d ? new Date(d).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function normalizeOrder(o) {
  return {
    id: o.id,
    status: o.status,
    email: o.email,
    amount: Number(o.amount) || 0,
    paymentId: o.paymentId ?? o.payment_id ?? null,
    createdAt: o.createdAt ?? o.created_at ?? null,
    expiresAt: o.expiresAt ?? o.expires_at ?? null,
    tickets: (o.tickets ?? []).map((t) => ({
      number: t.number,
      active: !!t.active,
    })),
  };
}

function fmtDate(s) {
  if (!s) return "-";
  const d = new Date(s);
  return d.toLocaleString("es-AR");
}

function statusPillClasses(status) {
  switch (status) {
    case "PAID":
      return "bg-fame-green/15 text-fame-green-dark border-fame-green/30";
    case "PENDING":
      return "bg-fame-accent/20 text-fame-black border-fame-accent/35";
    case "CANCELLED":
    case "ERROR":
    case "EXPIRED":
      return "bg-fame-danger/20 text-fame-black border-fame-danger/35";
    default:
      return "bg-fame-soft/15 text-fame-black border-fame-soft/35";
  }
}

function TicketChip({ number, active }) {
  const base =
    "inline-flex items-center rounded-full border font-semibold font-mono " +
    "px-2 py-1 text-xs sm:px-2.5 sm:py-1";

  const cls = active
    ? "bg-white text-fame-black border-fame-primary/30"
    : "bg-white/70 text-fame-black/50 border-fame-black/10";

  return <span class={`${base} ${cls}`}>{number}</span>;
}

function StatCard({ icon: Icon, label, value, tone = "neutral" }) {
  const toneCls =
    tone === "primary"
      ? "border-fame-primary/25"
      : tone === "accent"
      ? "border-fame-accent/30"
      : tone === "danger"
      ? "border-fame-danger/30"
      : "border-fame-black/10";

  const iconWrap =
    tone === "primary"
      ? "bg-fame-primary/12 text-fame-green-dark"
      : tone === "accent"
      ? "bg-fame-accent/18 text-fame-black"
      : tone === "danger"
      ? "bg-fame-danger/18 text-fame-black"
      : "bg-fame-soft/14 text-fame-black";

  return (
    <div class={`rounded-2xl border ${toneCls} bg-white p-4 shadow-sm`}>
      <div class="flex items-center gap-3">
        <div class={`h-10 w-10 rounded-2xl flex items-center justify-center ${iconWrap}`}>
          <Icon class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <div class="text-xs font-semibold text-fame-black/60">{label}</div>
          <div class="mt-1 text-xl font-extrabold text-fame-black tracking-tight">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Panels --------------------------- */

function StatsPanel({ stats }) {
  return (
    <aside class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
        <StatCard
          icon={BanknotesIcon}
          tone="primary"
          label="Monto total acumulado"
          value={formatARS(stats.revenue)}
        />

        <StatCard
          icon={TicketIcon}
          tone="accent"
          label="Rifas vendidas"
          value={stats.soldTickets}
        />

        <StatCard
          icon={ClockIcon}
          tone={stats.pendingTickets > 0 ? "accent" : "neutral"}
          label="Rifas pendientes"
          value={stats.pendingTickets}
        />

        <StatCard
          icon={Squares2X2Icon}
          label="Compras por cantidad de rifas"
          value={
            <div class="grid grid-cols-5 gap-2 mt-1">
              {[1, 3, 5, 10, 20].map((n) => (
                <div
                  key={n}
                  class="rounded-xl border border-fame-black/10 bg-fame-soft/10 px-2 py-2 text-center"
                >
                  <div class="text-[11px] font-semibold text-fame-black/70">{n}</div>
                  <div class="text-sm font-extrabold text-fame-black">{stats.packs[n]}</div>
                </div>
              ))}
            </div>
          }
        />
      </div>
    </aside>
  );
}

function OrdersPanel({ loading, ordered, openId, setOpenId, canSeeOrders }) {
  if (!canSeeOrders) {
    return (
      <section class="space-y-3">
        <div class="rounded-2xl border border-fame-black/10 bg-white p-4 text-sm text-fame-black/70">
          Tu usuario tiene acceso solo a <span class="font-semibold">estadísticas</span>.
        </div>
      </section>
    );
  }

  return (
    <section class="space-y-3">
      {loading ? (
        <div class="rounded-2xl border border-fame-black/10 bg-white p-4 text-sm text-fame-black/70">
          Cargando órdenes…
        </div>
      ) : ordered.length === 0 ? (
        <div class="rounded-2xl border border-fame-black/10 bg-white p-4 text-sm text-fame-black/70">
          No hay órdenes.
        </div>
      ) : (
        <div class="space-y-3">
          {ordered.map((o) => {
            const isOpen = openId === o.id;
            const ticketsCount = o.tickets?.length ?? 0;

            return (
              <div
                key={o.id}
                class="rounded-2xl border border-fame-black/10 bg-white shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : o.id)}
                  class="w-full text-left px-4 py-3 hover:bg-fame-black/5 transition"
                >
                  <div class="flex flex-col gap-2">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0 flex items-center gap-2">
                        <span
                          class={`shrink-0 px-2.5 py-1 rounded-full border text-xs font-extrabold tracking-wide ${statusPillClasses(
                            o.status
                          )}`}
                        >
                          {o.status}
                        </span>

                        <div class="min-w-0">
                          <div class="truncate font-semibold text-fame-black">
                            {o.email || "-"}
                          </div>
                        </div>
                      </div>

                      <div class="shrink-0 flex items-center gap-2">
                        <div class="text-right text-xs text-fame-black/60 hidden sm:block">
                          <div>
                            <span class="font-extrabold text-fame-black">{ticketsCount}</span>{" "}
                            tickets
                          </div>
                          <div class="text-[11px]">{fmtDate(o.createdAt)}</div>
                        </div>

                        <span
                          class={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-fame-black/10 bg-white text-fame-black/70 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden="true"
                        >
                          <ChevronDownIcon class="h-5 w-5" />
                        </span>
                      </div>
                    </div>

                    <div class="flex items-center justify-between text-xs text-fame-black/60 sm:hidden">
                      <div>
                        <span class="font-extrabold text-fame-black">{ticketsCount}</span>{" "}
                        tickets
                      </div>
                      <div>{fmtDate(o.createdAt)}</div>
                    </div>

                    <div class="w-full">
                      {ticketsCount > 0 ? (
                        <div class="flex flex-wrap gap-1.5">
                          {o.tickets.map((t) => (
                            <TicketChip key={t.number} number={t.number} active={t.active} />
                          ))}
                        </div>
                      ) : (
                        <div class="text-xs text-fame-black/50">Sin tickets</div>
                      )}
                    </div>
                  </div>
                </button>

                {isOpen && (
                  <div class="px-4 pb-4">
                    <div class="mt-2 rounded-xl border border-fame-black/10 bg-fame-soft/10 p-3">
                      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div class="text-fame-black/70">
                          <span class="font-semibold text-fame-black">OrderId:</span>{" "}
                          <span class="font-mono text-xs text-fame-black/80 break-all">{o.id}</span>
                        </div>

                        <div class="text-fame-black/70">
                          <span class="font-semibold text-fame-black">PaymentId:</span>{" "}
                          <span class="font-mono text-xs text-fame-black/80 break-all">
                            {o.paymentId || "-"}
                          </span>
                        </div>

                        <div class="text-fame-black/70">
                          <span class="font-semibold text-fame-black">Creada:</span>{" "}
                          {o.createdAt ? new Date(o.createdAt).toLocaleString("es-AR") : "-"}
                        </div>

                        <div class="text-fame-black/70">
                          <span class="font-semibold text-fame-black">Vence:</span>{" "}
                          {o.expiresAt ? new Date(o.expiresAt).toLocaleString("es-AR") : "-"}
                        </div>

                        <div class="text-fame-black/70">
                          <span class="font-semibold text-fame-black">Cantidad:</span>{" "}
                          {o.amount ?? "-"}
                        </div>

                        <div class="text-fame-black/70">
                          <span class="font-semibold text-fame-black">Tickets:</span> {ticketsCount}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* --------------------------- Page --------------------------- */

export function PanelPage() {
  const [session, setSession] = useState(null);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    const s = getSession();
    if (!s) {
      const next = encodeURIComponent(window.location.pathname || "/panel");
      window.location.replace(`/login?next=${next}`);
      return;
    }
    setSession(s);
  }, []);

  // Mientras decide/redirect, no renderizamos nada
  if (!session) return null;

  const canSeeOrders = session.user?.role === "admin";

  // 2) Load data (solo si es admin, porque /admin/orders va a estar bloqueado)
  async function load() {
    setLoading(true);

    if (!canSeeOrders) {
      setItems([]); // el viewer no ve órdenes
      setLoading(false);
      return;
    }

    try {
      const ordersResponse = await fetch(`${API_BASE}/admin/orders`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

      // si el token expiró del lado servidor o cambió secret → limpieza + redirect
      if (ordersResponse.status === 401) {
        clearSession();
        const next = encodeURIComponent(window.location.pathname || "/panel");
        window.location.replace(`/login?next=${next}`);
        return;
      }

      if (!ordersResponse.ok) throw new Error("No se pudo cargar /admin/orders");

      const data = await ordersResponse.json();
      const orders = data.items ?? data.orders ?? [];
      setItems(orders.map(normalizeOrder));
    } catch {
      // si querés, acá seteamos un error visual
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeOrders, session?.token]);

  const ordered = useMemo(() => {
    return [...items].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  }, [items]);

  // stats: por ahora se calculan desde las órdenes (solo admin).
  // Para viewer, ideal es tener un endpoint /admin/stats que devuelva esto.
  const stats = useMemo(() => {
    const paid = ordered.filter((o) => o.status === "PAID");
    const pending = ordered.filter((o) => o.status === "PENDING");

    const revenue = paid.reduce((acc, o) => acc + (Number(o.amount) || 0), 0);
    const soldTickets = paid.reduce((acc, o) => acc + (o.tickets?.length ?? 0), 0);
    const pendingTickets = pending.reduce((acc, o) => acc + (o.tickets?.length ?? 0), 0);

    const packs = { 1: 0, 3: 0, 5: 0, 10: 0, 20: 0 };
    for (const o of paid) {
      const qty = o.tickets?.length ?? 0;
      if (packs[qty] != null) packs[qty] += 1;
    }

    return {
      revenue,
      soldTickets,
      pendingTickets,
      packs,
      paidOrders: paid.length,
    };
  }, [ordered]);

  return (
    <div class="min-h-screen bg-fame-soft/10">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <StatsPanel stats={stats} />
          <OrdersPanel
            loading={loading}
            ordered={ordered}
            openId={openId}
            setOpenId={setOpenId}
            canSeeOrders={canSeeOrders}
          />
        </div>
      </div>
    </div>
  );
}
