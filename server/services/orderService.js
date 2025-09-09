export function createOrderService(orderRepository) {
  return {
    async createOrder(orderId, ticketIds, email) {
      await orderRepository.createOrder({ id: orderId, ticketIds, email });
    },

    async confirmOrder(orderId, paymentId, amount) {
      const updated = await orderRepository.updateOrderPayment(orderId, paymentId, amount);
      return updated;
    },

    async getOrder(orderId) {
      return await orderRepository.getOrder(orderId);
    }
  };
}