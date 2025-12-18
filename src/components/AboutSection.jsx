export function AboutSection() {
  return (
    <section className="bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header / Hook */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            <span className="text-base">💙</span>
            Información sobre AME y el bono solidario
          </div>

          <h2 className="mt-4 text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
            ¿Sabías que <span className="text-blue-700">1 de cada  40/50</span> personas en el mundo es portadora del gen que causa Atrofia Muscular Espinal (AME)?
            <br className="hidden md:block" />
            ¿Y que, a nivel mundial, <span className="text-blue-700">aproximadamente 1 de cada 10.000</span> bebés nace con AME? Una condición que cambia para siempre la vida de una familia. 
          </h2>

          <p className="mt-4 text-base md:text-lg text-gray-700 leading-relaxed max-w-3xl">
            La Atrofia Muscular Espinal (AME) es una enfermedad genética, degenerativa y hereditaria que afecta a las
            neuronas motoras (las que nos permiten hablar, caminar, respirar y tragar). Cuando estas neuronas se dañan,
            los músculos se debilitan y aparece la atrofia.
          </p>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 max-w-3xl">
            <p className="text-gray-800 leading-relaxed">
              AME no pregunta de dónde venís, quién sos ni cuál es tu situación económica.
              <br />
              Por eso, <span className="font-bold text-gray-900">NECESITAMOS TU COLABORACIÓN</span>.
            </p>
            <p className="mt-2 text-gray-700">
              Gracias a vos, el trabajo de FAME crece todos los días.
            </p>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900">
              Este bono nos va a ayudar a
            </h3>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                <p className="font-semibold text-gray-900">
                  ✨ Impulsar y avanzar una investigación con el Dr. Alfredo Cáceres (IUCBC) sobre regeneración celular
                </p>
                <p className="mt-2 text-gray-700 leading-relaxed">
                  Ya viene dando muy buenos resultados y es clave que sigamos avanzando.
                </p>

                {/* Optional: hide heavy text behind details */}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-blue-700 hover:text-blue-800">
                    Ver más detalles (reprogramación celular e iPS)
                  </summary>

                  <div className="mt-3 text-sm text-gray-700 leading-relaxed space-y-3">
                    <p>
                      La reprogramación celular permite convertir células de la piel en células madre pluripotentes
                      inducidas (iPS). Estas iPS pueden generar cualquier célula del cuerpo, incluyendo neuronas.
                    </p>
                    <p>
                      En el laboratorio podemos obtener neuronas a partir de piel de pacientes. Esto nos permite estudiar
                      diferencias entre neuronas de un paciente con una determinada enfermedad y neuronas sanas.
                    </p>
                    <p>
                      Ya se obtuvieron células de la piel de un paciente con AME 1 y se reprogramaron. En el laboratorio
                      del Dr. Cáceres (Córdoba) se está trabajando para generar neuronas a partir de ellas. Cuando se
                      logre, se podrá estudiar en profundidad qué diferencia a esa neurona de una sana y entender mucho
                      mejor la AME.
                    </p>
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900">
              Además, desde FAME
            </h3>

            <ul className="mt-4 space-y-3 text-gray-800">
              {[
                "Acompañamos y orientamos a las nuevas familias, para que el camino del diagnóstico sea más claro y humano y para que todas las personas con AME accedan a su tratamiento.",
                "Trabajamos para que la AME se incluya en la pesquisa neonatal a nivel nacional, porque un diagnóstico temprano puede cambiar drásticamente el pronóstico de vida.",
                "Impulsamos un proyecto para lograr incluir la AME en la pesquisa a nivel nacional.",
                "Capacitamos a profesionales de la salud, enviando médicos argentinos a formarse con expertos internacionales.",
                "Traemos especialistas del exterior para seguir elevando el nivel de atención en nuestro país.",
                "Y muchas acciones más para estar cerca de nuestra comunidad.",
              ].map((text, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6">
                    ✨
                  </span>
                  <p className="leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Closing */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <div className="md:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <p className="text-gray-800 leading-relaxed">
              Gracias de corazón por estar del otro lado.
              <br />
              AME no discrimina, y por eso tu ayuda es esencial.
            </p>
            <p className="mt-4 font-semibold text-gray-900">Juntos Somos Más.</p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 flex flex-col justify-between">
            <p className="text-gray-900 font-bold leading-snug">
              El sorteo se realizará el <span className="text-blue-800">6 de enero de 2026</span> por{" "}
              <span className="text-blue-800">Lotería Nacional Nocturna</span>.
            </p>

            <a
              href="https://www.fameargentina.com.ar"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              Ir a la página principal
            </a>

            <p className="mt-3 text-xs text-gray-600">
              Tu colaboración impulsa investigación, acompañamiento y capacitación.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
