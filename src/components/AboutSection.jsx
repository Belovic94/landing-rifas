export function AboutSection() {
  return (
    <section className="bg-fame-green/10">
      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Header / Hook */}
        <div className="relative mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-fame-soft/20 px-3 py-1 text-sm font-semibold text-fame-black ring-1 ring-fame-black/10">
            <span className="text-base">💛</span>
            Información sobre AME y el bono solidario
          </div>

          <h2 className="mt-4 max-w-4xl text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight text-fame-black">
            ¿Sabías que <span className="text-fame-primary">1 de cada 40/50</span> personas es portadora del gen que causa AME?
          </h2>

          {/* Segundo dato como bloque liviano */}
          <p className="mt-3 max-w-4xl text-base lg:text-lg text-fame-black/80">
            A nivel mundial, aproximadamente{" "}
            <span className="font-extrabold text-fame-primary">1 de cada 10.000</span>{" "}
            bebés nace con AME.
            <span className="text-fame-black/70"> Una condición que cambia para siempre la vida de una familia.</span>
          </p>

          <p className="mt-4 max-w-3xl text-sm lg:text-base leading-relaxed text-fame-black/75">
            La Atrofia Muscular Espinal (AME) es una enfermedad genética, degenerativa y hereditaria que afecta a las neuronas
            motoras (las que nos permiten hablar, caminar, respirar y tragar). Cuando estas neuronas se dañan, los músculos se
            debilitan y aparece la atrofia.
          </p>

          <img
            src="/assets/rey-corona.png"
            alt=""
            aria-hidden="true"
            className="
              pointer-events-none select-none
              hidden lg:block
              absolute
              right-0
              -translate-y-[70%]
              w-60
              opacity-95
              drop-shadow-lg
            "
          />

        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1 */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fame-black/10">
            <h3 className="text-lg font-extrabold text-fame-black">
              Este bono nos va a ayudar a
            </h3>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-fame-accent/15 p-4 ring-1 ring-fame-accent/25">
                <p className="font-semibold text-fame-black">
                  ✨ Impulsar y avanzar una investigación con el Dr. Alfredo Cáceres (IUCBC) sobre regeneración celular
                </p>
                <p className="mt-2 leading-relaxed text-fame-black/80">
                  Ya viene dando muy buenos resultados y es clave que sigamos avanzando.
                </p>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-fame-primary hover:text-fame-green-dark">
                    Ver más detalles (reprogramación celular e iPS)
                  </summary>

                  <div className="mt-3 space-y-3 text-sm leading-relaxed text-fame-black/80">
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
          <div className="relative rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fame-black/10">
            <h3 className="text-lg font-extrabold text-fame-black">
              Además, desde FAME
            </h3>

            <ul className="mt-4 space-y-3 text-fame-black/85">
              {[
                "Acompañamos y orientamos a las nuevas familias, para que el camino del diagnóstico sea más claro y humano y para que todas las personas con AME accedan a su tratamiento.",
                "Trabajamos para que la AME se incluya en la pesquisa neonatal a nivel nacional, porque un diagnóstico temprano puede cambiar drásticamente el pronóstico de vida.",
                "Impulsamos un proyecto para lograr incluir la AME en la pesquisa a nivel nacional.",
                "Capacitamos a profesionales de la salud, enviando médicos argentinos a formarse con expertos internacionales.",
                "Traemos especialistas del exterior para seguir elevando el nivel de atención en nuestro país.",
                "Y muchas acciones más para estar cerca de nuestra comunidad.",
              ].map((text, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center text-sm">
                    ✨
                  </span>
                  <p className="leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Closing */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-fame-black/10 md:col-span-2">
            <p className="leading-relaxed text-fame-black/85">
              Gracias de corazón por estar del otro lado.
              <br />
              AME no discrimina, y por eso tu ayuda es esencial.
            </p>
            <p className="mt-4 font-extrabold text-fame-black">Juntos Somos Más.</p>
          </div>

          <div className="rounded-2xl bg-fame-green/15 p-6 ring-1 ring-fame-black/10">
            <p className="font-extrabold leading-snug text-fame-black">
              El sorteo se realizará el{" "}
              <span className="text-fame-primary">6 de enero de 2026</span> por{" "}
              <span className="text-fame-primary">Lotería Nacional Nocturna</span>.
            </p>

            <a
              href="https://www.fameargentina.com.ar"
              className="
                mt-5 inline-flex w-full items-center justify-center rounded-xl
                bg-fame-primary px-4 py-2.5 font-semibold text-white shadow-sm
                hover:bg-fame-green-dark transition
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fame-soft/50
              "
            >
              Ir a la página principal
            </a>

            <p className="mt-3 text-xs text-fame-black/70">
              Tu colaboración impulsa investigación, acompañamiento y capacitación.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
