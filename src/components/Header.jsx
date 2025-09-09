export function Header() {
  return (
    <header
      class="text-center shadow-sm"
    >
      <div className='bg-gray-900 text-white text-center py-5'>
        <h1 class="text-4xl text-white font-bold">Familias AME Argentina</h1>
      </div>
      <div className='py-60 bg-cover bg-center flex flex-col items-center justify-center' style={{ backgroundImage: "url('/assets/slide-cura.jpg')" }}>
        <h2 class="text-white text-4xl md:text-6xl lg:text-7xl font-bold mb-4 drop-shadow-lg">Bono FAME ARGENTINA 2025</h2>
      <h3 class="text-white text-2xl md:text-3xl lg:text-4xl drop-shadow-md">Juntos Somos Más</h3>
      </div>
    </header>
  );
}