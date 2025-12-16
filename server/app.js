import express from "express";
import { createExpirationDate, getTicketPrice } from './utils.js';

export function createApp({ orderService, mercadoPagoService, mailService }) {

	const app = express();
	app.use(express.json());

	app.post("/create-preference", async (req, res) => {
		const { amount, email } = req.body;

		if (!amount || isNaN(amount)) {
			return res.status(400).json({ error: "amount inválido o faltante" });
		}

		const ticketsAmount = Number(amount);

		try {
			// expiresAt: podés usar Date o string ISO, según tu repo. Ideal: Date
			const expiresAt = createExpirationDate(Number(process.env.EXPIRE_PREFERENCE_MIN || 60));

			const result = await orderService.createPreferenceFlow(ticketsAmount, email, expiresAt);

			if (!result.ok && result.error === "INSUFFICIENT_STOCK") {
				return res.status(409).json({ error: "No hay suficientes rifas disponibles" });
			}

			const { orderId, numbers } = result;
			console.log("Blocked tickets are: ", numbers);

			try {
				const unitPrice = getTicketPrice(ticketsAmount);
				const totalPrice = unitPrice * ticketsAmount;

				const mpPref = await mercadoPagoService.createPreference({
					orderId: result.orderId,
					ticketsAmount,
					totalPrice,
					expirationDateTo: expiresAt,
				});
				return res.status(200).json({ init_point: mpPref.init_point });
			} catch (mpErr) {
				// si MP falla: liberar reserva + cancelar order
				await orderService.onPreferenceCreateFailed(orderId);
				console.error("Error creando preferencia:", mpErr);
				return res.status(500).send("Error");
			}
		} catch (err) {
			console.error("Error en create-preference:", err);
			return res.status(500).json({ error: "Error al reservar rifas" });
		}
	});

	app.post("/webhook", async (req, res) => {
		const { type, data } = req.body;
		if (type !== "payment") return res.sendStatus(404);

		try {
			const payment = await mercadoPagoService.getPaymentById(data.id);
			const orderId = payment?.external_reference;
			const status = String(payment?.status || "").toLowerCase();

			if (!orderId) return res.sendStatus(200);

			if (status === "approved") {
				const amount = payment.transaction_amount;
				const paymentId = payment.id;

				const { changed, order } = await orderService.handlePaymentApproved(orderId, paymentId, amount);

				// mandás mail solo si pasó a PAID recién
				if (changed === 1 && order) {
					try {
						await mailService.sendPurchaseEmail({
							to: order.email,
							numbers: order.tickets.filter(t => t.active).map(t => t.number),
							orderId,
							amount,
						});
					} catch (mailErr) {
						console.error("Error enviando email:", {
							message: mailErr?.message,
							code: mailErr?.code,
							errno: mailErr?.errno,
							syscall: mailErr?.syscall,
							host: mailErr?.host,
							port: mailErr?.port,
							response: mailErr?.response,
							stack: mailErr?.stack,
						});
					}
				}
			}

			if (["rejected", "cancelled", "expired"].includes(status)) {
				const reason =
					status === "expired" ? "EXPIRED" :
					status === "cancelled" ? "CANCELLED" :
					"ERROR";

				await orderService.handlePaymentFailedOrExpired(orderId, reason);
			}

			return res.sendStatus(200);
		} catch (err) {
			console.error("Error webhook:", err);
			return res.sendStatus(err.status || 500);
		}
	});

	return app;

}
