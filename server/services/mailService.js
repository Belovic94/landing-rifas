// services/mailService.js
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import { createSesService } from "./sesService.js";

/**
 * modes:
 *  - "file": guarda el mail en ./tmp/mails (dev sin red)
 *  - "ethereal": (dev con red)
 *  - "smtp": (prod con SMTP real)
 *  - "test": no envía
 *  - "sesApi": (prod con api de amazon SES)
 */
export function createMailService({ mode = "file" } = {}) {
  let transporterPromise = null;
  const sesService = mode === "sesApi" ? createSesService() : null;

  async function getTransporter() {
    if (mode === "test" || mode === "file" || mode === "sesApi") return null;

    if (!transporterPromise) {
      transporterPromise = (async () => {
        console.log("[MAIL] mode in getTransporter:", mode);

        if (mode === "smtp") {
          const port = Number(process.env.SMTP_PORT || 587);
          const secure = port === 465 || String(process.env.SMTP_SECURE).toLowerCase() === "true";
          console.log("[MAIL] SMTP config:", {
            host: process.env.SMTP_HOST,
            port,
            secure,
            user: process.env.SMTP_USER ? "set" : "missing",
            pass: process.env.SMTP_PASS ? "set" : "missing",
            from: process.env.SMTP_FROM,
          });
          

          const t = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure, // 465 true, 587 false
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },

            // timeouts para fallar rápido y con info
            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 20_000,

            // TLS/SNI ayuda en algunos entornos
            tls: {
              servername: process.env.SMTP_HOST,
            },

            // para 587: asegura STARTTLS
            requireTLS: port === 587,
          });
          return t;
        }

        const testAccount = await nodemailer.createTestAccount();
        console.log("[MAIL] Ethereal account:", {
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          user: testAccount.user,
        });

        const t = nodemailer.createTransport({
          host: testAccount.smtp.host,
          port: testAccount.smtp.port,
          secure: testAccount.smtp.secure,
          auth: { user: testAccount.user, pass: testAccount.pass },
        });
        console.log("[MAIL] transporter created (ethereal)");
        return t;
      })();
    }

    return transporterPromise;
  }
  
  function renderTemplate({ numbers, orderId, amount }) {
    const orgName = "FAME Argentina";
    const currency = "$";
    const numbersList = (numbers || []).join(" - ");

    const drawInfo =
      "El sorteo se realizará el 6 de enero de 2026 por Lotería Nacional Nocturna.";

    const prizesRaw =
      '1º Premio: 1 Televisor 50"|2º Premio: 1 Tablet Samsung Galaxy|3º Premio: 1 Olla Essen|4º Premio: 1 combo de juguetes|5º Premio: 1 Caja de productos Havanna|6º Premio: 1 Combo de reposera y bolso térmico';

    const prizes = prizesRaw
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    const infoHtml =
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

    const subject =`Tus números asignados - ${orgName}`;

    const text =
      `GRACIAS por comprar nuestro bono\n\n` +
      `Referencia: ${orderId}\n` +
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

  async function writeMailToDisk({ to, from, bcc, subject, text, html, meta = {} }) {
    const baseDir = process.env.MAIL_OUT_DIR || path.resolve(process.cwd(), "tmp", "mails");
    await fs.mkdir(baseDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeTo = String(to).replace(/[^a-z0-9@._-]/gi, "_");
    const prefix = `${ts}__${safeTo}__${meta.orderId || "no-order"}`;

    const htmlPath = path.join(baseDir, `${prefix}.html`);

    await fs.writeFile(htmlPath, html, "utf8");

    console.log("📧 Mail guardado:");
    console.log(" - HTML:", htmlPath);

    return htmlPath;
  }


  return {
    async sendPurchaseEmail({ to, numbers, orderId, amount }) {
      console.log("MailService mode:", mode);
      if (!to || mode === "test") return;

      const transporter = await getTransporter();

      const from = process.env.SMTP_FROM || "BONO NACIONAL Familias AME Argentina <bono@fameargentina.org.ar>";
      const bcc = process.env.ADMIN_EMAIL || undefined;

      const { subject, text, html } = renderTemplate({
        numbers,
        orderId,
        amount,
      });

      if (mode === "file") {
        const htmlPath =  await writeMailToDisk({
          to,
          from,
          bcc,
          subject,
          text,
          html,
          meta: { orderId, amount, numbersCount: numbers?.length ?? 0 },
        });
        const fileUrl = `file://${path.resolve(htmlPath)}`;
        console.log(" - ABRIR (file):", fileUrl);
        return;
      }

      if (mode === "sesApi") {
        console.log("[MAIL] sending via SES API");

        await sesService.sendEmail({
          from,
          to,
          bcc,
          subject,
          text,
          html,
        });

        return;
      }

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
