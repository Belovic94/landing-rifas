import nodemailer from 'nodemailer';

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP no configurado: defina SMTP_HOST, SMTP_USER y SMTP_PASS');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // 465 TLS implícito; 587 STARTTLS ni idea
    auth: { user, pass },
  });
}

function renderTemplate({ numbers, externalRef, amount }) {
  const orgName = process.env.ORG_NAME || 'FAME Argentina';
  const currency = process.env.CURRENCY_SYMBOL || '$';
  const numbersList = (numbers || []).join(' - ');
  const drawInfo =
    process.env.DRAW_INFO ||
    'El sorteo se realizará próximamente por Lotería Nacional Ciudad Vespertina';
  const prizesRaw =
    process.env.PRIZES ||
    '1er Premio una TV 32"|2do Premio una conservadora Coleman|3er Premio un kit de juego de playa + toallas';
  const prizes = prizesRaw.split('|').map((s) => s.trim()).filter(Boolean);

  const infoHtml =
    process.env.INFO_HTML ||
    `<p style="margin:16px 0 8px"><strong>¿Sabías que 1 de cada 40 personas en el mundo es portador de AME? y ¿Que de cada 6000 partos 1 niño nace con AME?</strong></p>
     <p style="margin:0 0 8px">AME es una enfermedad genética, degenerativa y hereditaria que no discrimina de donde venís, quién sos o cómo es tu situación económica y por eso con tu ayuda estás ayudando a que el trabajo de <strong>FAME</strong> sea cada vez más grande. Con esta ayuda nosotros hacemos entre otras cosas lo siguiente:</p>
     <ul style="margin:0 0 8px 20px; padding:0">
       <li>Enviamos a los mejores médicos Argentinos a capacitarse afuera.</li>
       <li>Traemos a los mejores médicos que nos capaciten.</li>
       <li>Co-financiamos y apoyamos una línea de investigación junto al Dr. Alberto Kornblihtt y el CONICET que busca mejorar los tratamientos que ya tenemos.</li>
       <li>Iniciamos una nueva investigación junto al Dr. Alfredo Cáceres sobre regeneración celular.</li>
       <li>Asesoramos y contenemos a las nuevas familias, para que el camino de AME sea más fácil.</li>
       <li>Presionamos y acompañamos para que todos los pacientes AME tengan su tratamiento.</li>
     </ul>
     <p style="margin:16px 0 0">Gracias de corazón por ayudarnos, AME no discrimina y por eso tu ayuda es fundamental.</p>
     <p style="margin:8px 0 0">Juntos Somos Más.</p>`;

  const subject = process.env.EMAIL_SUBJECT || `Tus números asignados - ${orgName}`;

  const text = `GRACIAS por comprar nuestro bono\n\n` +
    `Referencia: ${externalRef}\n` +
    `Monto: ${currency}${amount}\n` +
    `Tus números asignados son: ${numbersList}\n\n` +
    `${drawInfo}\n\n` +
    `Premios:\n- ${prizes.join('\n- ')}`;

  const html = `
    <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;line-height:1.6;color:#111;padding:8px 0">
      <div style="font-size:12px;color:#555">${orgName}</div>
      <h1 style="font-size:28px;margin:8px 0 16px;font-weight:800">GRACIAS por comprar nuestro bono</h1>
      <p style="margin:0 0 12px">Tus números asignados son</p>
      <p style="font-size:28px;margin:0 0 16px;font-weight:800;letter-spacing:1px">${numbersList}</p>
      <p style="margin:0 0 16px;color:#333">${drawInfo}</p>

      <h3 style="margin:16px 0 8px">Premios</h3>
      <ul style="margin:0 0 16px 20px; padding:0">
        ${prizes.map((p) => `<li>${p}</li>`).join('')}
      </ul>

      ${infoHtml}
    </div>
  `;

  return { subject, text, html };
}

export async function sendPurchaseEmail({ to, numbers, externalRef, amount }) {
  if (!to) return;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const bcc = process.env.ADMIN_EMAIL || undefined;

  const transporter = createTransport();

  const { subject, text, html } = renderTemplate({ numbers, externalRef, amount });
  await transporter.sendMail({ from, to, bcc, subject, text, html });
}

