import {
  BanknotesIcon,
  TicketIcon,
  ClockIcon,
  Squares2X2Icon
} from "@heroicons/react/24/outline";


function formatARS(n) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
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


export function StatsPanel({ stats }) {
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