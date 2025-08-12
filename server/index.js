import express from 'express';
import bodyParser from 'body-parser';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
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

const RIFA_PRICE = 10;

const calcularRifas = (amount) => {
  return amount / RIFA_PRICE;
};

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

  const ticketsAmount = Number(amount);
  const externalRef = uuidv4();
	let reservedTickets = null;

  try {
    reservedTickets = await reserveNumbersForPreference(externalRef, ticketsAmount);
		console.log("Random tickets are: ", reservedTickets);
	} catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ error: 'No hay suficientes rifas disponibles' });
    }
    console.error('Error reservando rifas', err);
    res.status(500).json({ error: 'Error al reservar rifas' });
  }

	const aPreference = {
		body: {
			items: [
				{
					id: externalRef,
					category_id: 'tickets',
					title: `Compra de ${ticketsAmount} rifas`,
					quantity: ticketsAmount,
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
		res.status(200).json({ init_point: response.init_point});
	} catch (err) {
		// Rollback reservation if preference creation fails
		await releaseReservation(externalRef);
		console.error('Error creando preferencia', err);
		res.status(500).send('Error');
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});