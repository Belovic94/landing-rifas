import { Header } from './Header';
import { Footer } from './Footer';

export function ErrorPage() {
  const contactEmail = "soporte@fameargentina.com.ar";

  return (
    <>
      <Header />
      <section class="bg-white py-10 px-6 max-w-4xl mx-auto text-center">
        <div class="mb-8">
          <div class="text-6xl mb-4">❌</div>
          <h1 class="text-4xl font-bold text-gray-900 mb-4">
            Ocurrió un error
          </h1>
          <p class="text-xl text-gray-700 mb-6">
            Lo sentimos, hubo un problema al procesar tu pago.
          </p>
        </div>

        <div class="bg-red-50 border-l-4 border-red-500 p-6 mb-8 text-left max-w-2xl mx-auto">
          <p class="text-lg text-gray-800 mb-4">
            Si el problema persiste o necesitas ayuda, por favor contáctanos:
          </p>
          <p class="text-lg text-gray-800">
            <strong>Email:</strong>{' '}
            <a 
              href={`mailto:${contactEmail}`}
              class="text-blue-600 hover:text-blue-800 underline"
            >
              {contactEmail}
            </a>
          </p>
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

