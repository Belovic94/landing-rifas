const prizes = [
  {
    place: '1º Premio',
    description: 'Orden de compra por un Televisor 50"',
    image: '',
  },
  {
    place: '2º Premio',
    description: 'Orden de compra por una Tablet',
    image: '',
  },
  {
    place: '3º Premio',
    description: '1 Olla Essen',
    image: '',
  },
  {
    place: '4º Premio',
    description: '1 Combo de juguetes',
    image: '',
  },
  {
    place: '5º Premio',
    description: '1 Caja de productos Havanna',
    image: '',
  },
  {
    place: '6º Premio',
    description: '1 Combo de reposera y bolso térmico',
    image: '',
  }
];

export function PrizesSection() {
  return (
    <section className="bg-white px-5 py-12 text-center">
      <h2 className="mb-8 text-3xl font-bold text-slate-800">
        Premios
      </h2>

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {prizes.map((prize, idx) => (
          <div
            key={idx}
            className="
              flex h-44 flex-col items-center justify-center
              rounded-xl bg-slate-100 p-5 text-center
              shadow-sm transition-all duration-300
              hover:-translate-y-1 hover:shadow-lg
            "
          >
            <h3 className="mb-2 text-lg font-semibold text-blue-800">
              {prize.place}
            </h3>

            <p className="text-sm text-slate-700">
              {prize.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}