require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mercadopago = require('mercadopago');

const app = express();
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, 'public')));


const client = new mercadopago.MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN });
const preference = new mercadopago.Preference(client);

const usuarios = {}; // { payment_id: { email, rifas } }
const rifa_price = 10;

function calcularRifas(monto) {
  if (monto >= 1000) return 10;
  if (monto >= 500) return 5;
  if (monto >= 200) return 2;
  return 1;
}

// Crear preferencia de pago
app.post('/crear-preferencia', async (req, res) => {
    const aPreference = {
        body: {
            items: [{
                title: 'Compra de rifas',
                quantity: 1,
                unit_price: parseFloat(rifa_price),
            }],
            back_urls: {
                success: "https://belovic94.github.io/landing-rifas/",
                failure: "https://belovic94.github.io/landing-rifas/",
                pending: "https://belovic94.github.io/landing-rifas/"
            },
            auto_return: "approved",
        }
    }

    try {
        const response = await preference.create(aPreference);
        console.log("preference_id: ", response.id);
        res.json({ preference_id: response.id });
    } catch (err) {
        console.error('Error creando preferencia', err);
        res.status(500).send('Error');
    }
});

// Webhook: recibir notificaciones de pago
app.post('/webhook', async (req, res) => {
  const { type, data } = req.body;

  if (type === 'payment') {
    try {
      const payment = await mercadopago.payment.findById(data.id);
      const info = payment.body;

      if (info.status === 'approved') {
        const email = info.payer.email;
        const monto = info.transaction_amount;
        const rifas = calcularRifas(monto);

        usuarios[info.id] = { email, rifas };

        console.log(`✅ Pago aprobado de ${email} por $${monto}`);
        console.log(`🎟️ Rifas asignadas: ${rifas}`);
      }
    } catch (err) {
      console.error('Error consultando pago:', err);
    }
  }

  res.sendStatus(200);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});