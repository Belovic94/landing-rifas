import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import {MercadoPagoConfig, Payment, Preference} from 'mercadopago';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' }); 

const app = express();
app.use(bodyParser.json());

const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN });
const preference = new Preference(client);

const RIFA_PRICE = 10;

const calcularRifas = (amount) => {
	return amount / RIFA_PRICE;
}

app.post('/create-preference', async (req, res) => {

	const { amount } = req.body;

	if (!amount || isNaN(amount)) {
    	return res.status(400).json({ error: 'amount inválido o faltante' });
  	}
	
	const externalRef = uuidv4();

	// Generar un campo en la base que tenga externalRef 
	// Los numeros de las rifas
	// Poner el status
	/* {
		id: externalRef,
		numbers:  [list de numeros]
		status: Pending, Paid
	}*/

	const aPreference = {
		body: {
			items: [{
				id: externalRef,
				category_id: "Rifas",
				title: `Compra de ${amount} rifas`,
				quantity: Number(amount),
				unit_price: parseFloat(RIFA_PRICE),
			}],
			external_reference: externalRef
		}
	}

	try {
		const response = await preference.create(aPreference);
		console.log(`Create preference with init_point: ${response.init_point} and external_reference: ${externalRef}`);
		res.json({ init_point: response.init_point });
	} catch (err) {
		console.error('Error creando preferencia', err);
		res.status(500).send('Error');
	}
});

app.post('/webhook', async (req, res) => {
  	const { type, data } = req.body;

	if (type === 'payment') {
		try {
			const payment = await new Payment(client).get({id: data.id});
			console.log(`Arrive payment with status: ${payment?.status} and external_reference: ${payment?.external_reference}`);

			if (payment?.status === 'approved') {
				const email = payment.payer.email;
				const amount = payment.transaction_amount;
				const rifas = calcularRifas(amount);

				//usuarios[info.id] = { email, rifas }; // HAY que agregar a la base.
				// Buscar 

				console.log(`✅ Pago aprobado de ${email} por $${amount}`);
				console.log(`🎟️ Rifas asignadas: ${rifas}`);
			}
			res.sendStatus(200);
			return;
		} catch (err) {
			console.error('Error consultando pago:', err);
			res.sendStatus(err.status);
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