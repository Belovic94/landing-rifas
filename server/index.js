import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import mercadopago from 'mercadopago';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' }); 



const app = express();
app.use(bodyParser.json());

/* const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public'))); */

const client = new mercadopago.MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN });
const preference = new mercadopago.Preference(client);

const rifa_price = 10;

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
					unit_price: parseFloat(rifa_price),
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