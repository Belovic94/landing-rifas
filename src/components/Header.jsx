export function Header() {
  return (
    <header className="text-center shadow-sm">
      {/* Barra institucional */}
      <div className="bg-fame-green-dark text-white py-5">
        <h1 className="text-2xl md:text-3xl font-bold">
          Familias AME Argentina
        </h1>
      </div>

      {/* Hero */}
      <div
        className="relative flex items-center justify-center bg-cover bg-center px-4 py-28 md:py-40"
        style={{ backgroundImage: "url('/assets/slide-cura.jpg')" }}
      >
        {/* Gradiente SOLO para contraste */}
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/35 to-black/70" />

        {/* Texto */}
        <div className="relative z-10 max-w-5xl text-center">
          <h2 className="
            text-3xl md:text-5xl lg:text-6xl
            font-extrabold text-white
            drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]
          ">
            Bono FAME Argentina 2026
          </h2>

          <h3 className="
            mt-4 text-xl md:text-2xl lg:text-3xl
            font-semibold text-fame-accent
            tracking-wide
            drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]
          ">
            Juntos somos más
          </h3>
        </div>
      </div>
    </header>
  );
}
