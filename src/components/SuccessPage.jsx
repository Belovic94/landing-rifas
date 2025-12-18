import { Header } from './Header';
import { Footer } from './Footer';
import { PrizesSection } from './PrizesSection';

export function SuccessPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-fame-green/10 px-6 py-12">
        <div className="mx-auto max-w-4xl text-center">
          {/* Estado */}
          <div className="mb-10 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-fame-black/10">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-fame-green/15 ring-1 ring-fame-green/25">
              <span className="text-3xl" aria-hidden="true">✅</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold text-fame-black">
              ¡Gracias por tu compra!
            </h1>

            <p className="mt-3 text-base md:text-lg text-fame-black/80">
              Tu pago fue aprobado.
            </p>
          </div>

          {/* Aviso importante */}
          <div className="mx-auto mb-12 max-w-3xl rounded-2xl bg-fame-green/15 p-6 text-left ring-1 ring-fame-green/25">
            <p className="text-base md:text-lg text-fame-black">
              En los próximos minutos vas a recibir un email con los{" "}
              <strong>números asignados</strong> a tu compra.
            </p>
            <p className="mt-2 text-sm md:text-base text-fame-black/80">
              Revisá tu bandeja de entrada y también la carpeta de spam/promociones.
            </p>
          </div>

          {/* Info sorteo */}
          <div className="mb-12">
            <h2 className="mb-3 text-2xl font-extrabold text-fame-black">
              Información del sorteo
            </h2>
            <p className="text-base md:text-lg text-fame-black/85">
              El sorteo se realizará el{" "}
              <span className="font-semibold text-fame-primary">
                6 de enero de 2026
              </span>{" "}
              por{" "}
              <span className="font-semibold text-fame-primary">
                Lotería Nacional Nocturna
              </span>.
            </p>
          </div>

          {/* Premios */}
          <div className="mb-14">
            <PrizesSection variant="plain" />
          </div>

          {/* CTA */}
          <div className="mt-10">
            <a
              href="/"
              className="
                inline-flex items-center justify-center rounded-xl
                bg-fame-primary px-6 py-3 text-sm font-semibold text-white
                shadow-sm transition hover:bg-fame-green-dark
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fame-soft/50
              "
            >
              Volver al inicio
            </a>
          </div>

          <p className="mt-6 text-xs text-fame-black/60">
            Gracias por apoyar a Familias AME Argentina 💛
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
