import { render } from 'preact';
import { useState, useEffect } from 'preact/hooks';

function App() {
	const defaultAmount = [1, 5, 10, 20];
  
	useEffect(() => {

  }, []);

	const handleClick = async (amount) => {
    try {
      const response = await fetch('/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
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
    <div class="w-full p-4 bg-gray-100">
			<div class="flex space-x-2 mb-4">
				{defaultAmount.map((amount) => (
          <button
            key={amount}
						onClick={() => handleClick(amount)}
            class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            {amount} rifas
          </button>
        ))}
      </div>
    </div>
  );
}


render(<App />, document.getElementById('app'));