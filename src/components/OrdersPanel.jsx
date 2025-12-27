import {

  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useState, useMemo } from "preact/hooks";
import { getSession, clearSession } from "../utils/auth";
import { SelectAutocomplete } from "./SelectAutocomplete";

const API_BASE = import.meta.env.VITE_API_BASE;

const ALL_STATUSES = ["PAID", "PENDING", "CANCELLED", "EXPIRED", "ERROR"];

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function statusFilterClasses(status, checked) {
  const base = statusPillClasses(status);

  return `
    ${base}
    ${checked
      ? "ring-1 ring-fame-black/10"
      : "opacity-70 hover:opacity-100"
    }
  `;
}


function fmtDate(s) {
  if (!s) return "-";

  const d = new Date(s);

  return d.toLocaleString("es-AR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
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

function getFilenameFromContentDisposition(cd) {
  // soporta filename=ordenes.xlsx y filename*=UTF-8''ordenes.xlsx
  const star = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (star?.[1]) {
    return decodeURIComponent(star[1].replace(/"/g, "").trim());
  }

  const normal = cd.match(/filename\s*=\s*([^;]+)/i);
  if (normal?.[1]) {
    return normal[1].replace(/"/g, "").trim();
  }

  return null;
}

export function OrdersPanel({
  loading,
  ordered,
  canSeeOrders
}) {
  if (!canSeeOrders) {
    return (
      <section class="space-y-3">
        <div class="rounded-2xl border border-fame-black/10 bg-white p-4 text-sm text-fame-black/70">
          Tu usuario tiene acceso solo a <span class="font-semibold">estadísticas</span>.
        </div>
      </section>
    );
  }

  const [openId, setOpenId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState(new Set());
  const [emailQuery, setEmailQuery] = useState("");

  const statuses = useMemo(() => {
    // si querés derivarlos de la data real en vez de ALL_STATUSES:
    const fromData = uniq((ordered ?? []).map((o) => o.status));
    return fromData.length ? fromData : ALL_STATUSES;
  }, [ordered]);

  const emailOptions = useMemo(() => {
    return uniq((ordered ?? []).map((o) => (o.email || "").trim().toLowerCase()));
  }, [ordered]);

  const filtered = useMemo(() => {
    const q = emailQuery.trim().toLowerCase();

    return (ordered ?? []).filter((o) => {
      const statusOk =
        selectedStatuses.size === 0 || selectedStatuses.has(o.status);

      const email = (o.email || "").toLowerCase();
      const emailOk = !q || email.includes(q);

      return statusOk && emailOk;
    });
  }, [ordered, selectedStatuses, emailQuery]);

  const toggleStatus = (s) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedStatuses(new Set());
    setEmailQuery("");
  };

	async function onExportExcel() {
		const userSession = getSession(); 

		if (!userSession) {
			const next = encodeURIComponent(window.location.pathname || "/panel");
			window.location.replace(`/login?next=${next}`);
			return;
		}

		try {
			setExporting(true);

			const resp = await fetch(`${API_BASE}/admin/orders/export`, {
				method: "GET",
				headers: {
					Authorization: `Bearer ${userSession.token}`,
					Accept:
						"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
				},
			});

			if (resp.status === 401) {
        clearSession();
        const next = encodeURIComponent(window.location.pathname || "/panel");
        window.location.replace(`/login?next=${next}`);
        return;
      }

			if (!resp.ok) {
				let msg = `Error exportando Excel (${resp.status})`;
				const ct = resp.headers.get("content-type") || "";
				if (ct.includes("application/json")) {
					const data = await resp.json().catch(() => null);
					if (data?.error) msg = data.error;
				}
				throw new Error(msg);
			}

			const blob = await resp.blob();

			const cd = resp.headers.get("content-disposition") || "";
			const fileName =
				getFilenameFromContentDisposition(cd) || "ordenes.xlsx";

			// Trigger download
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = fileName;
			document.body.appendChild(a);
			a.click();
			a.remove();
			window.URL.revokeObjectURL(url);
		} catch (err) {
			console.error("[EXPORT_EXCEL]", err);
		} finally {
			setExporting(false);
		}
	}

  return (
    <section class="rounded-2xl border border-fame-black/10 bg-white shadow-sm overflow-hidden">
      {/* Header sticky */}
      <div class="sticky top-0 z-10 border-b border-fame-black/10 bg-white/90 backdrop-blur">
        <div class="flex items-center justify-between gap-3 px-4 py-3">
          <div class="min-w-0">
            <div class="font-extrabold text-fame-black leading-tight">Órdenes</div>
            <div class="text-xs text-fame-black/60">
              {loading ? "Cargando…" : `${ordered?.length ?? 0} órdenes`}
            </div>
          </div>

         <div class="shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={clearFilters}
              class="inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-extrabold border border-fame-black/10 bg-white hover:bg-fame-black/5 text-fame-black/70"
            >
              Limpiar
            </button>

            <button
              type="button"
              onClick={onExportExcel}
              disabled={exporting || loading || !ordered?.length}
              class={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-extrabold border transition
                ${exporting || loading || !ordered?.length
                  ? "border-fame-black/10 bg-fame-black/5 text-fame-black/40 cursor-not-allowed"
                  : "border-fame-black/15 bg-white hover:bg-fame-black/5 text-fame-black"
                }`}
            >
              <span class="inline-flex h-5 w-5 items-center justify-center rounded-md border border-fame-black/10 bg-fame-soft/20">
                <span class="text-[11px] font-black">X</span>
              </span>
              {exporting ? "Exportando…" : "Exportar Excel"}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div class="px-4 pb-3 pt-2 space-y-3">
          {/* Estado (checkbox multi) */}
          <div>
            <div class="text-xs font-extrabold text-fame-black/70 mb-2">
              Estado
            </div>

            <div class="flex flex-wrap gap-2">
              {statuses.map((s) => {
                const checked = selectedStatuses.has(s);

                return (
                  <label
                    key={s}
                    class={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-extrabold cursor-pointer select-none transition
                      ${statusFilterClasses(s, checked)}
                    `}
                  >
                    <input
                      type="checkbox"
                      class="accent-fame-black"
                      checked={checked}
                      onChange={() => toggleStatus(s)}
                    />
                    {s}
                  </label>
                );
              })}
            </div>

            <div class="mt-2 text-[11px] text-fame-black/55">
              {selectedStatuses.size === 0 ? "Mostrando todos los estados." : "Filtrando por estados seleccionados."}
            </div>
          </div>

          {/* Email autocomplete */}
          <div>
            <div class="text-xs font-extrabold text-fame-black/70 mb-2">
              Buscar por email
            </div>

            <div class="flex items-center gap-2">
              <div class="flex-1">
                <SelectAutocomplete
                  options={emailOptions}
                  value={emailQuery}
                  onChange={setEmailQuery}
                />
              </div>

              {!!emailQuery && (
                <button
                  type="button"
                  onClick={() => setEmailQuery("")}
                  class="rounded-xl border border-fame-black/10 bg-white px-3 py-2 text-sm font-extrabold text-fame-black/70 hover:bg-fame-black/5"
                >
                  Borrar
                </button>
              )}
            </div>

            <div class="mt-2 text-[11px] text-fame-black/55">
              Tip: escribí una parte del mail para filtrar.
            </div>
          </div>
        </div>
      </div>

      {/* Body scrollable */}
      <div class="px-4 py-3 overflow-y-auto max-h-[60vh] lg:max-h-[calc(100vh-260px)]">
        {loading ? (
          <div class="rounded-2xl border border-fame-black/10 bg-white p-4 text-sm text-fame-black/70">
            Cargando órdenes…
          </div>
        ) : filtered.length === 0 ? (
          <div class="rounded-2xl border border-fame-black/10 bg-white p-4 text-sm text-fame-black/70">
            No hay órdenes con esos filtros.
          </div>
        ) : (
          <div class="space-y-3">
            {filtered.map((o) => {
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
                            <span class="font-mono text-xs text-fame-black/80 break-all">
                              {o.id}
                            </span>
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
                            <span class="font-semibold text-fame-black">Tickets:</span>{" "}
                            {ticketsCount}
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
      </div>
    </section>
  );
}
