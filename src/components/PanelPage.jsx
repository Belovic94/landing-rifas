import { useEffect, useMemo, useState } from "preact/hooks";
import { getSession, clearSession } from "../utils/auth";
import { OrdersPanel } from "./OrdersPanel";
import { StatsPanel } from "./StatsPanel";

const API_BASE = import.meta.env.VITE_API_BASE;

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

/* --------------------------- Page --------------------------- */

export function PanelPage() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const userSession = getSession();
    if (!userSession) {
      const next = encodeURIComponent(window.location.pathname || "/panel");
      window.location.replace(`/login?next=${next}`);
      return;
    }
    setSession(userSession);
  }, []);

  if (!session) return null;

  const canSeeOrders = session.user?.role === "admin";

  async function load() {
    setLoading(true);

    if (!canSeeOrders) {
      setItems([]);
      setLoading(false);
      return;
    }

    try {
      const ordersResponse = await fetch(`${API_BASE}/admin/orders`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });

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
            canSeeOrders={canSeeOrders}
          />
        </div>
      </div>
    </div>
  );
}
