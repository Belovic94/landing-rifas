import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import {
  initStorage,
  reserveNumbersForPreference,
  releaseReservation,
  confirmReservationAsSold,
} from './storage.js';
import { sendPurchaseEmail } from './mailer.js';

dotenv.config({ path: '.env.local' }); 

const app = express();
app.use(bodyParser.json());

const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN });
const preference = new Preference(client);

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RIFA_PRICE = 10;

const calcularRifas = (amount) => {
  return amount / RIFA_PRICE;
};

// Ensure data folder/files exist on startup (no top-level await issues)
(async () => {
  try {
    await initStorage();
  } catch (error) {
    console.error('Error inicializando archivos de datos', error);
  }
})();

app.post('/create-preference', async (req, res) => {
  const { amount } = req.body;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: 'amount inválido o faltante' });
  }

  const tickets = Number(amount);
  const externalRef = uuidv4();

  // Generar un campo en la base que tenga externalRef 
    // Los numeros de las rifas
    // Poner el status
    /* {
        id: externalRef,
        numbers:  [list de numeros]
        status: Pending, Paid
    }*/
  // Reservar números antes de crear la preferencia
  try {
    const reservedNumbers = await reserveNumbersForPreference(externalRef, tickets);

    const aPreference = {
      body: {
        items: [
          {
            id: externalRef,
            category_id: 'Rifas',
            title: `Compra de ${tickets} rifas`,
            quantity: tickets,
            unit_price: parseFloat(RIFA_PRICE),
          },
        ],
        external_reference: externalRef,
      },
    };

    try {
      const response = await preference.create(aPreference);
      console.log(
        `Create preference with init_point: ${response.init_point} and external_reference: ${externalRef}`
      );
      res.json({ init_point: response.init_point, external_reference: externalRef, numbers: reservedNumbers });
    } catch (err) {
      // Rollback reservation if preference creation fails
      await releaseReservation(externalRef);
      console.error('Error creando preferencia', err);
      res.status(500).send('Error');
    }
  } catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ error: 'No hay suficientes rifas disponibles' });
    }
    console.error('Error reservando rifas', err);
    res.status(500).json({ error: 'Error al reservar rifas' });
  }
});

app.post('/webhook', async (req, res) => {
  const { type, data } = req.body;

  if (type === 'payment') {
    try {
      const payment = await new Payment(client).get({ id: data.id });
      console.log(
        `Arrive payment with status: ${payment?.status} and external_reference: ${payment?.external_reference}`
      );

      const externalRef = payment?.external_reference;

      if (payment?.status === 'approved') {
        const email = payment.payer?.email;
        const amount = payment.transaction_amount;
        const paymentId = payment.id;

        const sold = await confirmReservationAsSold(externalRef, {
          email,
          amount,
          paymentId,
        });

        if (!sold) {
          console.warn(`No pending reservation found for externalRef ${externalRef}`);
        } else {
          console.log(`✅ Pago aprobado de ${email} por $${amount}`);
          console.log(`🎟️ Rifas asignadas: ${sold.numbers?.length}`);
          try {
            await sendPurchaseEmail({ to: email, numbers: sold.numbers, externalRef, amount });
          } catch (mailErr) {
            console.error('Error enviando email:', mailErr);
          }
        }
      } else if (
        ['rejected', 'cancelled', 'expired'].includes(String(payment?.status || '').toLowerCase()) // TODO: Ver si estos son los estados correctos
      ) {
        await releaseReservation(externalRef);
        console.log(`🔁 Reserva liberada para externalRef ${externalRef} por estado ${payment?.status}`);
      }
      res.sendStatus(200);
      return;
    } catch (err) {
      console.error('Error consultando pago:', err);
      res.sendStatus(err.status || 500);
      return;
    }
  }
  res.sendStatus(404);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});