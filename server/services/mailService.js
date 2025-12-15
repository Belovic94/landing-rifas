// services/mailService.js
import nodemailer from "nodemailer";

/**
 * Crea un mailService.
 *
 * modes:
 *  - "ethereal" (default): crea cuenta de prueba (dev)
 *  - "smtp": usa SMTP real (prod)
 *  - "test": no envía mails (tests)
 */
export function createMailService({ mode = "ethereal" } = {}) {
  let transporterPromise = null;

  async function getTransporter() {
    if (mode === "test") return null;

    if (!transporterPromise) {
      transporterPromise = (async () => {
        if (mode === "smtp") {
          return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT),
            secure: process.env.SMTP_SECURE === "true",
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
          });
        }

        // ethereal (dev)
        const testAccount = await nodemailer.createTestAccount();
        return nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
      })();
    }

    return transporterPromise;
  }

  function renderTemplate({ numbers, externalRef, amount }) {
    const orgName = process.env.ORG_NAME || "FAME Argentina";
    const currency = process.env.CURRENCY_SYMBOL || "$";
    const numbersList = (numbers || []).join(" - ");

    const drawInfo =
      process.env.DRAW_INFO ||
      "El sorteo se realizará el 6 de enero de 2026 por Lotería Nacional Nocturna.";

    const prizesRaw =
      process.env.PRIZES ||
      '1º Premio: 1 Televisor 50"|2º Premio: 1 Tablet Samsung Galaxy|3º Premio: 1 Olla Essen|4º Premio: 1 combo de juguetes|5º Premio: 1 Caja de productos Havanna|6º Premio: 1 Combo de reposera y bolso térmico';

    const prizes = prizesRaw
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    const infoHtml =
      process.env.INFO_HTML ||
      `<div style="margin:16px 0 8px">
        <p style="margin:8px 0"><strong>¿Sabías que 1 de cada 40 personas en el mundo es portadora de AME?</strong></p>
        <p style="margin:8px 0"><strong>¿Y que 1 de cada 6000 bebés nace con AME?</strong></p>
        
        <p style="margin:16px 0 8px">La Atrofia Muscular Espinal (AME) es una enfermedad genética, degenerativa y hereditaria que afecta a las neuronas motoras, esas que hacen posible que podamos hablar, caminar, respirar y tragar. Cuando estas neuronas se dañan, los músculos se debilitan y aparece la atrofia.</p>
        
        <p style="margin:16px 0 8px">AME no pregunta de dónde venís, quién sos ni cuál es tu situación económica.<br />
        Por eso, <strong>NECESITAMOS TU COLABORACIÓN</strong>.</p>
        
        <p style="margin:16px 0 8px">Gracias a vos, el trabajo de FAME crece todos los días.</p>
        
        <p style="margin:16px 0 8px"><strong>Este BONO nos va a ayudar a:</strong></p>
        
        <ul style="margin:8px 0 16px; padding-left:20px">
          <li style="margin:8px 0">
            <strong>✨ Impulsar y avanzar</strong> una investigación con el Dr. Alfredo Cáceres (IUCBC) sobre regeneración celular. Ya viene dando muy buenos resultados y es clave que sigamos avanzando.<br />
            Les contamos muy brevemente de qué se trata - La reprogramación celular permite convertir células de la piel en células madre pluripotentes inducidas (iPS, por sus siglas en inglés). Estas iPS pueden generar cualquier célula del cuerpo, incluyendo neuronas. Es decir, en el laboratorio podemos obtener neuronas a partir de piel de pacientes. Tener estas neuronas en el laboratorio nos permite estudiar qué diferencias hay entre las neuronas de un paciente de una determinada enfermedad y quien no la tiene.<br />
            Hemos podido obtener células de la piel de un paciente con AME 1 y reprogramarlas. En este momento, en el laboratorio del Dr. Cáceres en Córdoba se está tratando de generar neuronas a partir de ellas. Cuando eso se logre. Se podrá estudiar en profundidad que diferencia esa neurona de una sana y entender mucho mejor a la AME.
          </li>
        </ul>
        
        <p style="margin:16px 0 8px"><strong>Además, desde FAME:</strong></p>
        
        <ul style="margin:8px 0 16px; padding-left:20px">
          <li style="margin:4px 0">✨ Acompañamos y orientamos a las nuevas familias, para que el camino del diagnóstico sea más claro y humano y para que todas las personas con AME accedan a su tratamiento.</li>
          <li style="margin:4px 0">✨ Impulsamos un proyecto para lograr incluir la AME en la pesquisa a nivel nacional.</li>
          <li style="margin:4px 0">✨ Capacitamos a profesionales de la salud, enviando médicos argentinos a formarse con expertos internacionales.</li>
          <li style="margin:4px 0">✨ Traemos especialistas del exterior para seguir elevando el nivel de atención en nuestro país.</li>
          <li style="margin:4px 0">✨ Y muchas acciones más para estar cerca de nuestra comunidad.</li>
        </ul>
        
        <p style="margin:16px 0 8px">Gracias de corazón por estar del otro lado.<br />
        AME no discrimina, y por eso tu ayuda es esencial.</p>
        
        <p style="margin:16px 0 8px; font-weight:bold">Juntos Somos Más.</p>
       </div>`;

    const subject =
      process.env.EMAIL_SUBJECT || `Tus números asignados - ${orgName}`;

    const text =
      `GRACIAS por comprar nuestro bono\n\n` +
      `Referencia: ${externalRef}\n` +
      `Monto: ${currency}${amount}\n` +
      `Tus números asignados son: ${numbersList}\n\n` +
      `${drawInfo}\n\n` +
      `Premios:\n- ${prizes.join("\n- ")}`;

    const html = `
      <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;line-height:1.6;color:#111;padding:8px 0">
        <div style="font-size:12px;color:#555">${orgName}</div>
        <h1 style="font-size:28px;margin:8px 0 16px;font-weight:800">
          GRACIAS por comprar nuestro bono
        </h1>
        <p>Tus números asignados son</p>
        <p style="font-size:28px;font-weight:800">${numbersList}</p>
        <p>${drawInfo}</p>

        <h3 style="font-size:20px;margin:16px 0 8px;font-weight:700">Premios</h3>
        <ul style="margin:8px 0 16px; padding-left:20px; list-style:none">
          ${prizes.map((p) => `<li style="margin:8px 0; padding-left:20px; position:relative">✨ <strong>${p}</strong></li>`).join("")}
        </ul>

        ${infoHtml}
      </div>
    `;

    return { subject, text, html };
  }

  return {
    async sendPurchaseEmail({ to, numbers, externalRef, amount }) {
      if (!to || mode === "test") return;

      const transporter = await getTransporter();

      const from = process.env.SMTP_FROM || "FAME Argentina <no-reply@fame.org>";
      const bcc = process.env.ADMIN_EMAIL || undefined;

      const { subject, text, html } = renderTemplate({
        numbers,
        externalRef,
        amount,
      });

      const info = await transporter.sendMail({
        from,
        to,
        bcc,
        subject,
        text,
        html,
      });

      if (mode === "ethereal") {
        console.log(
          "📧 Mail preview:",
          nodemailer.getTestMessageUrl(info)
        );
      }
    },
  };
}
