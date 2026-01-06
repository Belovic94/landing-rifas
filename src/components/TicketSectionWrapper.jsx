import { useEffect, useState } from "preact/hooks";
import { TicketSection } from "./TicketSection";

export function TicketSectionWrapper() {
  const [enabled, setEnabled] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}/config`)
      .then(r => r.json())
      .then(data => setEnabled(Boolean(data.ticketsEnabled)))
      .catch(() => setEnabled(true));
  }, []);

  if (enabled === null) return null;
  if (!enabled) {
    return (
      <div className="	w-full bg-fame-green/10">
        <div className="
					px-6 py-10
					text-center
					ring-
			">
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-fame-green/25">
					<span className="text-3xl">💚</span>
					</div>

					<h2 className="text-2xl md:text-3xl font-extrabold text-fame-black">
					La venta ha finalizado
					</h2>

					<p className="mt-3 text-base md:text-lg text-fame-black/80">
					¡¡Gracias por participar y mucha suerte para todos!!
					</p>
				</div>
			</div>
    );
  }

  return <TicketSection />;
}