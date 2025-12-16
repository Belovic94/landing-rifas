import request from "supertest";
import { createApp } from "../../server/app.js";
import { getDb, initDatabase } from "../../server/db.js";

import { createOrderRepository } from "../../server/repositories/orderRepository.js";
import { createReservationRepository } from "../../server/repositories/reservationRepository.js";
import { createOrderService } from "../../server/services/orderService.js";

const db = getDb();

beforeAll(async () => {
  await initDatabase(db, true);
});

afterAll(async () => {
  await db.end();
});

test("POST /create-preference reserva tickets y devuelve init_point", async () => {
  const orderRepo = createOrderRepository(db);
  const reservationRepo = createReservationRepository(db);
  const orderService = createOrderService({ db: db, orderRepo, reservationRepo });

  const mercadoPagoService = {
    createPreference: async () => ({ init_point: "https://mp/init_point_fake" }),
    getPaymentById: async () => null,
  };
  
  const mailService = {
    sendPurchaseEmail: async () => {}, // mock
  };

  const app = createApp({ orderService, mercadoPagoService, mailService });

  const res = await request(app)
    .post("/create-preference")
    .send({ amount: 3, email: "test@fame.com" });

  expect(res.statusCode).toBe(200);
  expect(res.body.init_point).toContain("https://mp/init_point_fake");
});


test("concurrencia: 2 reservas simultáneas no comparten tickets", async () => {
  const orderRepo = createOrderRepository(db);
  const reservationRepo = createReservationRepository(db);
  const orderService = createOrderService({ db: db, orderRepo, reservationRepo });

  const mercadoPagoService = {
    createPreference: async () => ({ init_point: "https://mp/init_point_fake" }),
    getPaymentById: async () => null,
  };

  const mailService = {
		sendPurchaseEmail: async () => {}, // mock
	};

  const app = createApp({ orderService, mercadoPagoService, mailService });

  const [r1, r2] = await Promise.all([
    request(app).post("/create-preference").send({ amount: 5, email: "a@testA.com" }),
    request(app).post("/create-preference").send({ amount: 5, email: "b@testB.com" }),
  ]);

  expect(r1.statusCode).toBe(200);
  expect(r2.statusCode).toBe(200);

  // Validación DB: no hay tickets activos duplicados
  const { rows } = await db.query(`
    SELECT ticket_number, COUNT(*)
    FROM order_tickets
    WHERE released_at IS NULL
    GROUP BY ticket_number
    HAVING COUNT(*) > 1
  `);
  expect(rows.length).toBe(0);
});

test("webhook approved marca PAID y tickets quedan activos", async () => {
  // Creamos una order real reservando 2 tickets
  const orderRepo = createOrderRepository(db);
  const reservationRepo = createReservationRepository(db);
  const orderService = createOrderService({ db: db, orderRepo, reservationRepo });

  const preference = await orderService.createPreferenceFlow(2, "pay@ok.com", new Date(Date.now() + 15 * 60 * 1000));
  expect(preference.ok).toBe(true);

	const mercadoPagoService = {
    createPreference: async () => ({ init_point: "https://mp/init_point_fake" }),
    getPaymentById: async ({ id }) => ({
      id,
      status: "approved",
      external_reference: preference.orderId,
      transaction_amount: 1000,
    }),
  };

	const mailService = {
		sendPurchaseEmail: async () => {}, // mock
	};

  const app = createApp({ orderService, mercadoPagoService, mailService });

  const res = await request(app)
    .post("/webhook")
    .send({ type: "payment", data: { id: "123" } });

  expect(res.statusCode).toBe(200);

  const { rows } = await db.query(`SELECT status FROM orders WHERE id = $1`, [preference.orderId]);
  expect(rows[0].status).toBe("PAID");

  // tickets siguen activos (released_at NULL)
  const { rows: active } = await db.query(
    `SELECT COUNT(*)::int AS c FROM order_tickets WHERE order_id = $1 AND released_at IS NULL`,
    [preference.orderId]
  );
  expect(active[0].c).toBe(2);
});

