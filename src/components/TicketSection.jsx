import { useState, useMemo, useRef } from 'preact/hooks';
import { TicketIcon } from '@heroicons/react/24/outline';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const TIERS = [
  { min: 20, price: 3000 },
  { min: 10, price: 3500 },
  { min: 5,  price: 4000 },
  { min: 3,  price: 4500 },
  { min: 1,  price: 5000 },
];

function getTier(amount) {
  return TIERS.find(t => amount >= t.min) ?? TIERS[TIERS.length - 1];
}

function formatARS(n) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8v2a6 6 0 0 0-6 6H4z"
      />
    </svg>
  );
}

export function TicketSection() {
  const defaultAmount = [1, 3, 5, 10, 20];
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(null);
  const [emailTouched, setEmailTouched] = useState(false);

  // ✅ nuevo
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(null);
  const [ctaText, setCtaText] = useState("Comprar");

  const emailError = useMemo(() => {
    if (!emailTouched) return "";
    if (!email) return "Ingresá tu email";
    if (!EMAIL_RE.test(email)) return "El email no es válido";
    return "";
  }, [email, emailTouched]);

  const isEmailValid = EMAIL_RE.test(email);

  const selected = useMemo(() => {
    if (!amount) return null;
    const { price: unit } = getTier(amount);
    return { unit, total: unit * amount };
  }, [amount]);

  const API_BASE = import.meta.env.VITE_API_BASE;

  const handleClick = async () => {
    if (isLoading) return;
    if (!isEmailValid) { setEmailTouched(true); return; }
    if (!amount) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setCtaText("Creando preferencia…");

    let willRedirect = false;

    try {
      const response = await fetch(`${API_BASE}/create-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, email }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Error en el servidor');

      const data = await response.json();

      if (data?.init_point) {
        willRedirect = true;

        setCtaText("Redirigiendo a MercadoPago…");
        window.location.assign(data.init_point);
        return;
      }

      console.error('No se recibió init_point en la respuesta');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Error al crear preferencia:', error);
      }
    } finally {
      if (!willRedirect) {  
        setIsLoading(false);
        setCtaText("Comprar");
      }
    }
  };


  const isCtaDisabled = isLoading || !amount || !isEmailValid;

  return (
    <section className="w-full bg-fame-green/10 px-4 py-10">
      <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fame-black/10">
        <h3 className="text-center text-lg font-semibold text-fame-black">
          Elegí tu cantidad de números
        </h3>
        <p className="mt-1 text-center text-sm text-fame-black/70">
          Seleccioná una opción y dejá tu email para enviarte la confirmación.
        </p>

        {/* Amounts */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {defaultAmount.map((a) => {
            const { price: unit } = getTier(a);

            return (
              <label key={a} className="block cursor-pointer">
                <input
                  type="radio"
                  name="amount"
                  value={a}
                  onChange={() => setAmount(a)}
                  className="peer sr-only"
                  aria-label={`Seleccionar ${a} números`}
                  disabled={isLoading} 
                />

                <div
                  className="
                    relative flex h-[82px] flex-col items-center justify-center rounded-xl
                    border border-fame-black/15 bg-white text-fame-black shadow-sm
                    transition-all duration-200
                    hover:-translate-y-0.5 hover:border-fame-primary/50 hover:shadow
                    focus-within:ring-2 focus-within:ring-fame-soft/40
                    peer-checked:border-fame-primary peer-checked:bg-fame-green/15 peer-checked:text-fame-black
                    disabled:opacity-60
                  "
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{a}</span>
                    <TicketIcon className="h-5 w-5 text-fame-primary" />
                  </div>

                  <div className="text-[10px] text-fame-black">
                    {formatARS(unit)} c/u
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Resumen seleccionado */}
        <div className="mt-5 rounded-xl bg-fame-green/10 p-4 ring-1 ring-fame-black/10">
          {selected ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-fame-black">
                  Total a pagar: {formatARS(selected.total)}
                </div>
                <div className="mt-1 text-xs text-fame-black/70">
                  {amount} números · {formatARS(selected.unit)} c/u
                </div>
              </div>

              <div className="rounded-lg bg-fame-accent px-3 py-2 text-xs font-semibold text-fame-black ring-1 ring-fame-accent/40">
                Seleccionado
              </div>
            </div>
          ) : (
            <div className="text-sm text-fame-black/70">
              Elegí una cantidad para ver el total.
            </div>
          )}
        </div>

        {/* Email */}
        <div className="mt-6">
          <label htmlFor="email" className="block text-left text-sm font-medium text-fame-black">
            Email
          </label>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="email"
              id="email"
              placeholder="Ingresá tu email..."
              disabled={isLoading} // ✅ opcional
              className={`
                w-full rounded-xl border bg-white px-4 py-3 text-fame-black
                outline-none transition placeholder:text-fame-black/40
                focus:ring-2 focus:ring-fame-soft/35
                disabled:opacity-60 disabled:cursor-not-allowed
                ${emailError
                  ? "border-fame-danger focus:border-fame-danger focus:ring-fame-danger/25"
                  : "border-fame-black/15 focus:border-fame-primary"}
              `}
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              onBlur={() => setEmailTouched(true)}
            />
          </div>

          {emailError && (
            <p className="mt-1 text-sm text-fame-danger">{emailError}</p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleClick}
          disabled={isCtaDisabled}
          className="
            mt-6 w-full rounded-xl px-6 py-3 text-sm font-semibold text-white
            shadow-sm transition
            bg-fame-primary hover:bg-fame-primary hover:shadow
            active:scale-[0.99]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fame-soft/40
            disabled:cursor-not-allowed disabled:bg-fame-black/30 disabled:text-white/80
          "
        >
          <span className="inline-flex items-center justify-center gap-2">
            {isLoading && <Spinner />}
            {ctaText}
          </span>
        </button>

        <p className="mt-3 text-center text-xs text-fame-black/60">
          Vas a ser redirigido a MercadoPago para completar el pago.
        </p>

        <p className="mt-2 text-center text-[11px] text-fame-black/55">
          Si no te llega el mail, revisá spam/promociones.
        </p>
      </div>
    </section>
  );
}
