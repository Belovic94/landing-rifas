const prizes = [
  { place: '1º Premio', description: '1 Orden de compra para televisor 50"' },
  { place: '2º Premio', description: '1 Orden de compra para Tablet' },
  { place: '3º Premio', description: '1 Olla Essen' },
  { place: '4º Premio', description: '1 Combo de juguetes' },
  { place: '5º Premio', description: '1 Caja de productos Havanna' },
  { place: '6º Premio', description: '1 Combo de reposera y bolso térmico' },
];

export function PrizesSection({ variant = "default" } = {}) {
  const sectionBg = variant === "plain" ? "bg-transparent" : "bg-fame-green/10";
  
  return (
    <section className={`${sectionBg} px-5 py-14 text-center`}>
      <h2 className="mb-3 text-3xl font-extrabold text-fame-black">
        Premios
      </h2>
      <p className="mb-10 text-sm text-fame-black/70">
        Participás automáticamente por alguno de estos premios
      </p>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {prizes.map((prize, idx) => {
          const isFirst = idx === 0;

          return (
            <div
              key={idx}
              className={`
                relative flex flex-col items-center justify-center
                rounded-2xl p-6 text-center
                shadow-sm transition-all duration-300
                hover:-translate-y-1 hover:shadow-lg
                ${isFirst
                  ? 'bg-fame-accent/30 ring-2 ring-fame-accent'
                  : 'bg-white ring-1 ring-fame-black/10'}
              `}
            >
              {/* Etiqueta */}
              <span
                className={`
                  mb-3 rounded-full px-4 py-1 text-sm font-bold
                  ${isFirst
                    ? 'bg-fame-accent text-fame-black'
                    : 'bg-fame-soft/20 text-fame-black'}
                `}
              >
                {prize.place}
              </span>

              {/* Descripción */}
              <p className="text-base font-medium text-fame-black">
                {prize.description}
              </p>

              {/* Destacado visual 1º */}
              {isFirst && (
                <div className="mt-4 text-xs font-semibold text-fame-black/70">
                  ⭐ Premio principal
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}