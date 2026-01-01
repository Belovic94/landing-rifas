import { useEffect, useMemo, useState } from "preact/hooks";
import { getSession, clearSession } from "../utils/auth";
import { OrdersPanel } from "./OrdersPanel";
import { StatsPanel } from "./StatsPanel";

const API_BASE = import.meta.env.VITE_API_BASE;

async function fetchJson(path, token, onUnauthorized) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) {
    onUnauthorized?.();
    return null;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`No se pudo cargar ${path} (${res.status}) ${text}`);
  }

  return res.json();
}

async function loadStats({ token, setStats, setLoadingStats, onUnauthorized }) {
  setLoadingStats(true);
  try {
    const data = await fetchJson("/admin/stats", token, onUnauthorized);
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
  onUnauthorized,
}) {
  if (!canSeeOrders) {
    setItems([]);
    setLoadingOrders(false);
    return;
  }

  setLoadingOrders(true);
  try {
    const data = await fetchJson("/admin/orders", token, onUnauthorized);
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
  // Soporta: { ok: true, stats: {...} } o { stats: {...} } o directamente {...}
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
    if (!session?.token) return;

    const onUnauthorized = () => {
      clearSession();
      const next = encodeURIComponent(window.location.pathname || "/panel");
      window.location.replace(`/login?next=${next}`);
    };

    // stats y orders arrancan en paralelo, pero no se bloquean entre sí
    loadStats({
      token: session.token,
      setStats,
      setLoadingStats,
      onUnauthorized,
    });

    loadOrders({
      token: session.token,
      canSeeOrders,
      setItems,
      setLoadingOrders,
      onUnauthorized,
    });
  }, [session?.token, canSeeOrders]);

  const ordered = useMemo(() => {
    return [...items].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
  }, [items]);

  return (
    <div class="min-h-screen bg-fame-soft/10">
      <div class="max-w-7xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          <StatsPanel stats={stats} loading={loadingStats} />
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
