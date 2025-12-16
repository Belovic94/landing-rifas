import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

// services/mercadoPagoService.js

export function createMercadoPagoService({
  accessToken,
  webhookUrl,
  successUrl,
  pendingUrl,
  failureUrl,
}) {

  if (!accessToken) {
    throw new Error("MercadoPago: accessToken missing (check env var).");
  }

  const client = new MercadoPagoConfig({ accessToken });
  const preferenceClient = new Preference(client);
  const paymentClient = new Payment(client);

  return {
    async createPreference({ orderId, ticketsAmount, totalPrice, expirationDateTo }) {
      const payload = {
        body: {
          items: [
            {
              id: orderId,
              category_id: "tickets",
              title: `BONO FAME: Compra de ${ticketsAmount} rifas`,
              quantity: 1,
              unit_price: totalPrice,
            },
          ],
          external_reference: orderId,
          notification_url: webhookUrl,
          back_urls: {
            success: successUrl,
            pending: pendingUrl,
            failure: failureUrl,
          },
          auto_return: "approved",
          expires: true,
          expiration_date_to: expirationDateTo, // Date o ISO string según tu helper
          payment_methods: {
            excluded_payment_types: [
              { id: "ticket" },
              { id: "atm" },
            ],
          },
        },
      };

      const response = await preferenceClient.create(payload);

      return {
        init_point: response.init_point,
      };
    },

    async getPaymentById(paymentId) {
      return await paymentClient.get({ id: paymentId });
    },

    async findLatestPaymentByExternalReference(orderId) {
      const result = await paymentClient.search({
        options: {
          external_reference: orderId,
          sort: "date_created",
          criteria: "desc",
          limit: 1,
        },
      });

      return result?.results?.[0] ?? null;
    }
  };
}


