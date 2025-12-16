import { useState, useEffect } from 'preact/hooks';
import { TicketIcon} from '@heroicons/react/24/outline';

export function TicketSection() {
  const defaultAmount = [1, 3, 5, 10, 20];
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState(null);
  
	useEffect(() => {

  }, []);

	const handleClick = async () => {
    try {
      const response = await fetch('/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({amount, email}),
      });

      if (!response.ok) {
        throw new Error('Error en el servidor');
      }

      const data = await response.json();
      console.log('Respuesta del servidor:', data);

			// Redirigir al usuario a la URL del pago
			if (data?.init_point) {
				window.location.href = data.init_point;
			} else {
				console.error('No se recibió init_point en la respuesta');
			}
			
      
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
        {defaultAmount.map((a) => (
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
                flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white
                text-slate-700 shadow-sm
                transition-all duration-200
                hover:-translate-y-0.5 hover:border-blue-300 hover:shadow
                focus-within:ring-2 focus-within:ring-blue-500/30
                peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-checked:text-blue-700
                peer-checked:shadow
              "
            >
              <span className="text-sm font-semibold">{a}</span>
              <TicketIcon className="h-5 w-5 text-blue-600" />
            </div>
          </label>
        ))}
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
            className="
              w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900
              outline-none transition
              placeholder:text-slate-400
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
            "
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleClick}
        className="
          mt-6 w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white
          shadow-sm transition
          hover:bg-blue-700 hover:shadow
          active:scale-[0.99]
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30
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