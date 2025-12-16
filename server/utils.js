export function createExpirationDate(minutes) {
  const now = new Date();
  const expirationDate = new Date(now.getTime() + (minutes * 60 * 1000));
  
  return expirationDate.toISOString();
}

// Ticket pricing tiers
const TICKET_PRICE_SINGLE = 5000;
const TICKET_PRICE_3_PLUS = 4000;
const TICKET_PRICE_5_PLUS = 3500;
const TICKET_PRICE_10_PLUS = 3000;

const TICKET_TIER_3 = 3;
const TICKET_TIER_5 = 5;
const TICKET_TIER_10 = 10;

/**
 * @param {number} ticketsAmount
 * @returns {number} ticket unit price 
 */
export function getTicketPrice(ticketsAmount) {
  if (ticketsAmount >= TICKET_TIER_10) {
    return TICKET_PRICE_10_PLUS;
  } else if (ticketsAmount >= TICKET_TIER_5) {
    return TICKET_PRICE_5_PLUS;
  } else if (ticketsAmount >= TICKET_TIER_3) {
    return TICKET_PRICE_3_PLUS;
  } else {
    return TICKET_PRICE_SINGLE;
  }
}