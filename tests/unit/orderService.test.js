import { createOrderService } from '../../server/services/orderService'

test("createPreferenceFlow -> INSUFFICIENT_STOCK si reserva devuelve menos", async () => {
  const fakeDb = {
    connect: async () => ({
      query: async () => {},
      release: () => {},
    }),
  };

  const orderRepo = {
    createOrder: async () => {},
  };

  const reservationRepo = {
    reserveRandomTickets: async () => ["0001"], // devuelve menos que lo pedido
  };

  const orderService = createOrderService({ db: fakeDb, orderRepo, reservationRepo });

  // hack: el fake client necesita BEGIN/ROLLBACK/COMMIT
  fakeDb.connect = async () => ({
    query: async () => {},
    release: () => {},
  });

  const result = await orderService.createPreferenceFlow(3, "a@b.com", new Date());

  expect(result.ok).toBe(false);
  expect(result.error).toBe("INSUFFICIENT_STOCK");
});
