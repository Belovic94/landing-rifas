import { useEffect, useMemo, useState } from "preact/hooks";
import { getSession } from "../utils/auth";
import { OrdersPanel } from "./OrdersPanel";
import { StatsPanel } from "./StatsPanel";
import { fetchJson } from "../utils/api";
import { TicketLookupPanel } from "./TicketLookupPanel";

async function loadStats({ token, setStats, setLoadingStats }) {
  setLoadingStats(true);
  try {
    const data = await fetchJson("/admin/stats", token);
    if (!data) return;

    setStats(normalizeStats(data));
  } finally {
    setLoadingStats(false);
  }
}

async function loadOrders({
  token,
  canSeeOrders,
  setItems,
  setLoadingOrders,
}) {
  if (!canSeeOrders) {
    setItems([]);
    setLoadingOrders(false);
    return;
  }

  setLoadingOrders(true);
  try {
    const data = await fetchJson("/admin/orders", token);
    if (!data) return;

    const orders = data.items ?? data.orders ?? [];
    setItems(orders.map(normalizeOrder));
  } finally {
    setLoadingOrders(false);
  }
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

function normalizeStats(payload) {
  const s = payload?.stats ?? payload ?? {};

  const packsRaw = s.packs ?? s.salesByPack ?? {};
  const packs = {
    1: Number(packsRaw["1"] ?? packsRaw[1] ?? 0),
    3: Number(packsRaw["3"] ?? packsRaw[3] ?? 0),
    5: Number(packsRaw["5"] ?? packsRaw[5] ?? 0),
    10: Number(packsRaw["10"] ?? packsRaw[10] ?? 0),
    20: Number(packsRaw["20"] ?? packsRaw[20] ?? 0),
  };

  return {
    // nombres como los usabas en el front
    revenue: Number(s.amountTotal ?? s.revenue ?? 0),
    soldTickets: Number(s.ticketsSold ?? s.soldTickets ?? 0),
    pendingTickets: Number(s.ticketsPending ?? s.pendingTickets ?? 0),
    packs,
  };
}

/* --------------------------- Page --------------------------- */

export function PanelPage() {
  const [session, setSession] = useState(null);

  const [loadingOrders, setLoadingOrders] = useState(true);
  const [items, setItems] = useState([]);

  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    revenue: 0,
    soldTickets: 0,
    pendingTickets: 0,
    packs: { 1: 0, 3: 0, 5: 0, 10: 0, 20: 0 },
  });


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

  useEffect(() => {
    if (!session?.token) return;

    // stats y orders arrancan en paralelo, pero no se bloquean entre sí
    loadStats({
      token: session.token,
      setStats,
      setLoadingStats,
    });

    loadOrders({
      token: session.token,
      canSeeOrders,
      setItems,
      setLoadingOrders,
    });
  }, [session?.token, canSeeOrders]);

  const ordered = useMemo(() => {
    return [...items].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  }, [items]);

  return (
    <div class="min-h-screen bg-fame-soft/10">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <div class="space-y-6">
            <StatsPanel stats={stats} loading={loadingStats} />
            <TicketLookupPanel
              token={session.token}
            />
          </div>

          <OrdersPanel
            loading={loadingOrders}
            ordered={ordered}
            canSeeOrders={canSeeOrders}
          />
        </div>
      </div>
    </div>
  );
}
