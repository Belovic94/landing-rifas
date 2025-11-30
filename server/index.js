import express from 'express';
import bodyParser from 'body-parser';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { sendPurchaseEmail } from './mailer.js';
import { getDb } from "./db.js";
import { createTicketRepository } from "./repositories/ticketRepository.js";
import { createTicketService } from "./services/ticketService.js";
import { createOrderRepository } from "./repositories/orderRepository.js";
import { createOrderService } from "./services/orderService.js";
import { createExpirationDate } from './utils.js';

dotenv.config({ path: '.env.local' }); 

const app = express();
app.use(bodyParser.json());

const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN });
const preference = new Preference(client);
const db = getDb();

// Tickets
const ticketRepository = createTicketRepository(db);
const ticketService = createTicketService(ticketRepository, db);

// Orders
const orderRepository = createOrderRepository(db);
const orderService = createOrderService(orderRepository, ticketRepository, db);

// Ticket pricing tiers
const TICKET_PRICE_SINGLE = 5000;
const TICKET_PRICE_3_PLUS = 4000;
const TICKET_PRICE_5_PLUS = 3500;
const TICKET_PRICE_10_PLUS = 3000;

const TICKET_TIER_3 = 3;
const TICKET_TIER_5 = 5;
const TICKET_TIER_10 = 10;

/**
 * @param {number} ticketsAmount
 * @returns {number} ticket unit price 
 */
function getTicketPrice(ticketsAmount) {
  if (ticketsAmount >= TICKET_TIER_10) {
    return TICKET_PRICE_10_PLUS;
  } else if (ticketsAmount >= TICKET_TIER_5) {
    return TICKET_PRICE_5_PLUS;
  } else if (ticketsAmount >= TICKET_TIER_3) {
    return TICKET_PRICE_3_PLUS;
  } else {
    return TICKET_PRICE_SINGLE;
  }
}

async function testDatabase() {
  try {
    const client = await db.connect();
    console.log("✅ Conexión a la DB exitosa");

    const { rows } = await client.query("SELECT COUNT(*) FROM tickets");
    console.log(`🟢 Tickets totales en DB: ${rows[0].count}`);

    client.release();
  } catch (err) {
    console.error("❌ Error conectando o testeando la DB:", err);
    process.exit(1);
  }
}

await testDatabase();

app.post('/create-preference', async (req, res) => {
  const { amount, email } = req.body;

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ error: 'amount inválido o faltante' });
  }

  const ticketsAmount = Number(amount);
  const ticketOrderId = uuidv4();
	let reservedTickets = null;

  try {
    reservedTickets = await ticketService.blockTickets(ticketsAmount, ticketOrderId);
    console.log("Blocked tickets are: ", reservedTickets);
	} catch (err) {
    if (err.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ error: 'No hay suficientes rifas disponibles' });
    }
    console.error('Error reservando rifas', err);
    res.status(500).json({ error: 'Error al reservar rifas' });
  }

  await orderService.createOrder(ticketOrderId, reservedTickets.map(ticket => ticket.id), email);

	const aPreference = {
		body: {
			items: [
				{
					id: ticketOrderId,
					category_id: 'tickets',
					title: `BONO FAME: Compra de ${ticketsAmount} rifas`,
					quantity: 1,
					unit_price: getTicketPrice(ticketsAmount) * ticketsAmount,
				},
			],
			external_reference: ticketOrderId,
      expires: true,
      expiration_date_to: createExpirationDate(1),
      notification_url: process.env.WEBHOOK_URL
		},
	};

	try {
		const response = await preference.create(aPreference);
		console.log(
			`Create preference with init_point: ${response.init_point} and ticket_order_id: ${ticketOrderId}`
		);
		res.status(200).json({ init_point: response.init_point});
	} catch (err) {
		await ticketService.releaseOrder(ticketOrderId);
		console.error('Error creando preferencia', err);
		res.status(500).send('Error');
	}
  
});

app.post('/webhook', async (req, res) => {
  const { type, data } = req.body;

  if (type === 'payment') {
    try {
      const payment = await new Payment(client).get({ id: data.id });
      const ticketOrderId = payment?.external_reference;
      console.log(
        `Arrive payment with status: ${payment?.status} and ticket_order_id: ${ticketOrderId}`
      );

      if (payment?.status === 'approved') {
        const amount = payment.transaction_amount;
        const paymentId = payment.id;

        const result = await orderService.confirmOrderAndTickets(ticketOrderId, paymentId, amount);
        if (!result) {
          console.warn(`No se pudo confirmar orden + tickets para ticketOrderId ${ticketOrderId}`);
        } else {
          const { order, updatedTickets } = result;
          console.log(`Order: ${JSON.stringify(order)}`);
          console.log(`✅ Pago aprobado de ${order.email} por $${amount}`);
          console.log(`🎟️ Rifas asignadas: ${order.numbers?.length} (updatedTickets=${JSON.stringify(order.numbers)})`);
          try {
            await sendPurchaseEmail({
              to: order.email,
              numbers: order.numbers,
              ticketOrderId,
              amount,
            });
          } catch (mailErr) {
            console.error('Error enviando email:', mailErr);
          }
        }
      } else if (
        ['rejected', 'cancelled', 'expired'].includes(String(payment?.status || '').toLowerCase()) // TODO: Ver si estos son los estados correctos
      ) {
        await ticketService.releaseOrder(ticketOrderId);
        console.log(`🔁 Reserva liberada para ticketOrderId ${ticketOrderId} por estado ${payment?.status}`);
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

app.use((err, req, res, next) => {
  console.error("Error en request:", err);
  res.status(500).json({ error: "Ocurrió un error inesperado" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});