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
    <div className="w-full p-4 bg-gray-100">
      <div className='w-full flex flex-col space-y-4 items-center max-w-sm mx-auto'>
        <div class="grid grid-cols-2 [@media(min-width:425px)]:grid-cols-4 gap-3 w-full">
          {defaultAmount.map((amount) => (
            <label
              key={amount}
              className="cursor-pointer"
            >
              <input
                type="radio"
                name="amount"
                value={amount}
                onChange={() => setAmount(amount)}
                className="peer hidden"
              />
              <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-gray-300 hover:border-blue-600 transition
              peer-checked:border-blue-600 peer-checked:bg-blue-100 text-center">
                  <span className="font-medium">{amount}</span>
                  <TicketIcon className="w-6 h-6 text-blue-500" />
              </div>
            </label>
          ))}
        </div>
        <div className="flex items-center gap-1 w-full">
          <label htmlFor="email" className="font-medium text-gray-700">
            Email: 
          </label>
          <input
            type="email"
            id="email"
            placeholder="Ingresá un email..."
            className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-600 transition  w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className='flex items-center justify-center w-full'>
          <button
            onClick={handleClick}
            className=" w-full cursor-pointer mt-4 px-10 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Comprar
          </button>
        </div>
      </div>
    </div>
  );
}