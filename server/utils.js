export function createExpirationDate(minutes) {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + (minutes * 60 * 1000));
  
  return expirationDate.toISOString();
}

// Tramos de precio (ordenados de MAYOR a MENOR cantidad)
const TICKET_PRICE_TIERS = [
  { min: 20, price: 3000 },
  { min: 10, price: 3500 },
  { min: 5,  price: 4000 },
  { min: 3,  price: 4500 },
  { min: 1,  price: 5000 },
];

/**
 * @param {number} ticketsAmount
 * @returns {number} precio unitario del ticket
 */
export function getTicketPrice(ticketsAmount) {
  const tier = TICKET_PRICE_TIERS.find(
    ({ min }) => ticketsAmount >= min
  );

  return tier.price;
}
