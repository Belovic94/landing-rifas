import { useState, useMemo } from 'preact/hooks';
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

export function TicketSection() {
  const defaultAmount = [1, 3, 5, 10, 20];
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(null);
  const [emailTouched, setEmailTouched] = useState(false);

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

  const BASE_URL = "https://api.bono2026.fameargentina.org.ar";

  const handleClick = async () => {
    if (!isEmailValid) {
      setEmailTouched(true);
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/create-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, email }),
      });

      if (!response.ok) throw new Error('Error en el servidor');

      const data = await response.json();
      if (data?.init_point) window.location.href = data.init_point;
      else console.error('No se recibió init_point en la respuesta');
    } catch (error) {
      console.error('Error al crear preferencia:', error);
    }
  };

  return (
    <section className="w-full bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-center text-lg font-semibold text-slate-800">
          Elegí tu cantidad de números
        </h3>
        <p className="mt-1 text-center text-sm text-slate-500">
          Seleccioná una opción y dejá tu email para enviarte la confirmación.
        </p>

        {/* Amounts */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {defaultAmount.map((a) => {
            const { price: unit } = getTier(a);
            const total = unit * a;

            return (
              <label key={a} className="block cursor-pointer">
                <input
                  type="radio"
                  name="amount"
                  value={a}
                  onChange={() => setAmount(a)}
                  className="peer sr-only"
                  aria-label={`Seleccionar ${a} números`}
                />

                <div
                  className="
                    relative flex h-[78px] flex-col items-center justify-center rounded-xl
                    border border-slate-200 bg-white text-slate-700 shadow-sm
                    transition-all duration-200
                    hover:-translate-y-0.5 hover:border-blue-300 hover:shadow
                    focus-within:ring-2 focus-within:ring-blue-500/30
                    peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-800
                  "
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{a}</span>
                    <TicketIcon className="h-5 w-5 text-blue-600" />
                  </div>

                  {/* TOTAL (lo importante) */}
                  <div className="mt-1 text-xs font-semibold text-slate-800">
                    {formatARS(total)}
                  </div>

                  {/* opcional: unitario chiquito */}
                  <div className="text-[10px] text-slate-500">
                    {formatARS(unit)} c/u
                  </div>
                </div>
              </label>
            );
          })}
        </div>

        {/* Resumen seleccionado */}
        <div className="mt-5 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          {selected ? (
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-800">
                  Total a pagar: {formatARS(selected.total)}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  {amount} números · {formatARS(selected.unit)} c/u
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 ring-1 ring-blue-200">
                Seleccionado
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-600">
              Elegí una cantidad para ver el total.
            </div>
          )}
        </div>

        {/* Email */}
        <div className="mt-6">
          <label htmlFor="email" className="block text-left text-sm font-medium text-slate-700">
            Email
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="email"
              id="email"
              placeholder="Ingresá tu email..."
              className={`
                w-full rounded-xl border bg-white px-4 py-3 text-slate-900
                outline-none transition placeholder:text-slate-400
                focus:ring-2 focus:ring-blue-500/20
                ${emailError
                  ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-200 focus:border-blue-500"}
              `}
              value={email}
              onChange={(e) => setEmail(e.target.value.trim())}
              onBlur={() => setEmailTouched(true)}
            />
            
          </div>
          {emailError && (
            <p className="mt-1 text-sm text-red-600">{emailError}</p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleClick}
          disabled={!amount || !isEmailValid}
          className="
            mt-6 w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white
            shadow-sm transition
            hover:bg-blue-700 hover:shadow
            active:scale-[0.99]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30
            disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600
          "
        >
          Comprar
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          Vas a ser redirigido a MercadoPago para completar el pago.
        </p>
      </div>
    </section>
  );
}
