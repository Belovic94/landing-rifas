import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import {MercadoPagoConfig, Payment, Preference} from 'mercadopago';
import dotenv from 'dotenv';

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

	const aPreference = {
		body: {
			items: [{
				title: `Compra de ${amount} rifas`,
				quantity: Number(amount),
				unit_price: parseFloat(RIFA_PRICE),
			}]
		}
	}

	try {
		const response = await preference.create(aPreference);
		console.log("preference_id: ", response.init_point);
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
			const paymentData = await new Payment(client).get({id: data.id});
			const info = paymentData.body;

			if (info.status === 'approved') {
				const email = info.payer.email;
				const amount = info.transaction_amount;
				const rifas = calcularRifas(amount);

				//usuarios[info.id] = { email, rifas }; // HAY que agregar a la base.

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