import { Header } from './Header';
import { Footer } from './Footer';

export function ErrorPage() {
  const contactEmail = "soporte@fameargentina.com.ar";

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-fame-green/10 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-fame-black/10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-fame-danger/15 ring-1 ring-fame-danger/25">
              <span className="text-3xl" aria-hidden="true">❌</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-fame-black">
              Ocurrió un error
            </h1>

            <p className="mt-3 text-base md:text-lg text-fame-black/80">
              Lo sentimos, hubo un problema al procesar tu pago. Podés intentar nuevamente o escribirnos y te ayudamos.
            </p>

            <div className="mt-8 rounded-2xl bg-fame-danger/10 p-6 text-left ring-1 ring-fame-danger/20">
              <p className="text-sm md:text-base text-fame-black/85">
                Si el problema persiste o necesitás ayuda, contactanos:
              </p>

              <div className="mt-3 flex flex-col gap-2 text-sm md:text-base">
                <div className="text-fame-black">
                  <span className="font-semibold">Email:</span>{" "}
                  <a
                    href={`mailto:${contactEmail}`}
                    className="font-semibold text-fame-primary underline underline-offset-4 hover:text-fame-green-dark"
                  >
                    {contactEmail}
                  </a>
                </div>

                <p className="text-xs text-fame-black/70">
                  Si podés, contanos qué monto intentaste comprar y el email que usaste.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href="/"
                className="inline-flex items-center justify-center rounded-xl bg-fame-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-fame-green-dark"
              >
                Volver al inicio
              </a>

              <a
                href={`mailto:${contactEmail}?subject=${encodeURIComponent("Ayuda con pago - Bono FAME 2026")}`}
                className="inline-flex items-center justify-center rounded-xl bg-fame-accent/25 px-6 py-3 text-sm font-semibold text-fame-black ring-1 ring-fame-accent/30 transition hover:bg-fame-accent/35"
              >
                Escribir a soporte
              </a>
            </div>

            <p className="mt-6 text-xs text-fame-black/60">
              No te preocupes: si el pago no se acreditó, no se te va a cobrar.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
