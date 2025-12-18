import express from "express";
import { createExpirationDate, getTicketPrice } from './utils.js';

function reqLog(label, extra = {}) {
  const base = {
    ts: new Date().toISOString(),
    ...extra,
  };
  console.log(`[${label}]`, base);
}

export function createApp({ orderService, mercadoPagoService, mailService }) {

	const app = express();
	app.use(express.json());

	app.post("/create-preference", async (req, res) => {
		const startedAt = Date.now();
		const { amount, email } = req.body;

		reqLog("CREATE_PREF_START", {
			amount,
			email
		});

		if (!amount || isNaN(amount)) {
			reqLog("CREATE_PREF_BAD_REQUEST", { amount });
			return res.status(400).json({ error: "amount inválido o faltante" });
		}

		const ticketsAmount = Number(amount);

		try {
			// expiresAt: podés usar Date o string ISO, según tu repo. Ideal: Date
			const expiresAt = createExpirationDate(Number(process.env.EXPIRE_PREFERENCE_MIN || 60));

			const result = await orderService.createPreferenceFlow(ticketsAmount, email, expiresAt);

			if (!result.ok && result.error === "INSUFFICIENT_STOCK") {
				reqLog("CREATE_PREF_NO_STOCK", {
					ticketsAmount,
					durationMs: Date.now() - startedAt,
				});
				return res.status(409).json({ error: "No hay suficientes rifas disponibles" });
			}

			const { orderId, numbers } = result;
			reqLog("CREATE_PREF_TICKETS_BLOCKED", {
				orderId,
				numbers: numbers.numbers
			});

			try {
				const unitPrice = getTicketPrice(ticketsAmount);
				const totalPrice = unitPrice * ticketsAmount;

				const mpPref = await mercadoPagoService.createPreference({
					orderId: result.orderId,
					ticketsAmount,
					totalPrice,
					expirationDateTo: expiresAt,
				});

				reqLog("CREATE_PREF_SUCCESS", {
					orderId,
					initPoint: mpPref.init_point,
					durationMs: Date.now() - startedAt,
				});
				return res.status(200).json({ init_point: mpPref.init_point });
			} catch (mpErr) {
				// si MP falla: liberar reserva + cancelar order

				await orderService.onPreferenceCreateFailed(orderId);
				reqLog("CREATE_PREF_MP_ERROR", {
					orderId,
					message: mpErr?.message,
					durationMs: Date.now() - startedAt,
				});
				console.error("Error creando preferencia:", mpErr);
				return res.status(500).send("Error");
			}
		} catch (err) {
			reqLog("CREATE_PREF_ERROR", {
				message: err?.message,
				stack: err?.stack,
				durationMs: Date.now() - startedAt,
			});
			return res.status(500).json({ error: "Error al reservar rifas" });
		}
	});

	app.post("/webhook", async (req, res) => {
		 const startedAt = Date.now();

		const type =
			req.body?.type ||
			req.query?.type ||
			req.query?.topic; // MP a veces usa topic=payment

		const paymentId =
			req.body?.data?.id ||
			req.query?.["data.id"] ||
			req.query?.id; // MP a veces manda id=...

		reqLog("WEBHOOK_RECEIVED", { type, paymentId });

		if (type !== "payment" || !paymentId) {
			reqLog("WEBHOOK_IGNORED", { type, paymentId });
			return res.sendStatus(200);
		}

		try {
			const payment = await mercadoPagoService.getPaymentById(paymentId);
			const orderId = payment?.external_reference;
			const status = String(payment?.status || "").toLowerCase();

			if (!orderId) return res.sendStatus(200);

			if (status === "approved") {
				const amount = payment.transaction_amount;
				const orderPaymentId = payment.id;

				const { changed, order } = await orderService.handlePaymentApproved(orderId, orderPaymentId, amount);
				reqLog("WEBHOOK_APPROVED_HANDLED", {
					orderId,
					changed,
				});

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

			reqLog("WEBHOOK_DONE", {
				orderId,
				durationMs: Date.now() - startedAt,
			});

			return res.sendStatus(200);
		} catch (err) {
			reqLog("WEBHOOK_ERROR", {
				message: err?.message,
				stack: err?.stack,
				durationMs: Date.now() - startedAt,
			});
			return res.sendStatus(err.status || 500);
		}
	});

	app.get("/health-check", (_, res) => res.send("ok"));

	return app;

}
