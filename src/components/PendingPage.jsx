import { Header } from './Header';
import { Footer } from './Footer';
import { PrizesSection } from './PrizesSection';

export function PendingPage() {
  return (
    <>
      <Header />
      <section class="bg-white py-10 px-6 max-w-4xl mx-auto text-center">
        <div class="mb-8">
          <div class="text-6xl mb-4">⏳</div>
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            ¡Gracias por tu compra!
          </h1>
          <p class="text-xl text-gray-700 mb-6">
            Tu pago está siendo procesado. Esto puede tardar.
          </p>
        </div>

        <div class="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8 text-left">
          <p class="text-lg text-gray-800 mb-4">
            <strong>Importante:</strong> Una vez que tu pago sea aprobado, recibirás un email con los números asignados a tu compra.
          </p>
          <p class="text-lg text-gray-800">
            <strong>Revisa tu bandeja de entrada (y spam)</strong>
          </p>
        </div>

        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">
            Información del Sorteo
          </h2>
          <p class="text-lg text-gray-800 mb-4">
            <strong>El sorteo se realizará el 6 de enero de 2026 por Lotería Nacional Nocturna.</strong>
          </p>
        </div>

        <div class="mb-8">
          <h2 class="text-2xl font-bold text-gray-900 mb-6">
            Premios del Sorteo
          </h2>
          <PrizesSection />
        </div>

        <div class="mt-8">
          <a
            href="/"
            class="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded shadow inline-block"
          >
            Volver al inicio
          </a>
        </div>
      </section>
      <Footer />
    </>
  );
}

