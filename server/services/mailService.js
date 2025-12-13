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
      "El sorteo se realizará próximamente por Lotería Nacional Ciudad Vespertina";

    const prizesRaw =
      process.env.PRIZES ||
      '1er Premio una TV 32"|2do Premio una conservadora Coleman|3er Premio un kit de juego de playa + toallas';

    const prizes = prizesRaw
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean);

    const infoHtml =
      process.env.INFO_HTML ||
      `<p style="margin:16px 0 8px"><strong>¿Sabías que 1 de cada 40 personas en el mundo es portador de AME?</strong></p>
       <p>Gracias por ayudarnos. Juntos Somos Más.</p>`;

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

        <h3>Premios</h3>
        <ul>
          ${prizes.map((p) => `<li>${p}</li>`).join("")}
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
