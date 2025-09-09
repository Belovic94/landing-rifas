import fs from 'fs/promises';
import path from 'path';

// Base directory for data files (project root + server/data)
const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const FILE_TICKETS = path.join(DATA_DIR, 'tickets.json');
const FILE_ORDERS = path.join(DATA_DIR, 'orders.json');

export async function initStorage() {
  await ensureDataFiles();
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = [FILE_TICKETS, FILE_ORDERS];
  for (const filePath of files) {
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, '[]', 'utf-8');
    }
  }
}

async function readJson(filePath, fallback = []) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (error) {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, json, 'utf-8');
}

async function getAvailableNumbers() {
  const tickets = await readJson(FILE_TICKETS, []);
  return tickets.filter(ticket => ticket.status === 'AVAILABLE');
}

async function setPendingNumbers(reservedTickets, anOrderId) {
  const tickets = await readJson(FILE_TICKETS, []);
  const numbers = reservedTickets.map(ticket => ticket.number);
  
  const updatedTickets = tickets.map(ticket => {
    if (numbers.includes(ticket.number)) {
      return { ...ticket, status: 'PENDING', orderId: anOrderId };
    }
    return ticket;
  });

  await writeJson(FILE_TICKETS, updatedTickets);
}

async function setSoldNumbers(order) {
  const tickets = await readJson(FILE_TICKETS, []);

  const updatedTickets = tickets.map(ticket => {
    if (ticket.orderId === order.id) {
      return { ...ticket, status: 'SOLD'};
    }
    return ticket;
  });

  await writeJson(FILE_TICKETS, updatedTickets);
}

async function releaseNumbersByOrder(order) {
  const tickets = await readJson(FILE_TICKETS, []);

  const updatedTickets = tickets.map(ticket => {
    if (ticket.orderId === order.id) {
      return { ...ticket, status: 'AVAILABLE', orderId: null};
    }
    return ticket;
  });

  await writeJson(FILE_TICKETS, updatedTickets);
}

async function getOrderById(orderId) {
  const orders = await readJson(FILE_ORDERS, []);
  return orders.find(order => order.id === orderId) || null;
}

async function addOrder(orderId, reservedTickets) {
  let orders = await readJson(FILE_ORDERS, []);

  orders.push({
    id: orderId,
    status: 'PENDING',
    numbers: reservedTickets.map(ticket => ticket.number),
    createdAt: new Date().toISOString(),
  });

  await writeJson(FILE_ORDERS, orders);
}

async function invalidateOrder(order) {
  let orders = await readJson(FILE_ORDERS, []);

  const updatedOrders = orders.map(anOrder => {
    if (anOrder.id === order.id) {
      return { ...order, status: 'ERROR'};
    }
    return anOrder;
  });

  await writeJson(FILE_ORDERS, updatedOrders);
}

async function changeOrderStateToSold(order, extraData) {
  let orders = await readJson(FILE_ORDERS, []);
  let updateOrder = { ...order, ...extraData, status: 'SOLD'};
  const updatedOrders = orders.map(anOrder => {
    if (anOrder.id === order.id) {
      return updateOrder;
    }
    return anOrder;
  });

  await writeJson(FILE_ORDERS, updatedOrders);
  return updateOrder;
}

function getSelectionMode() {
  const mode = (process.env.RIFA_SELECTION_MODE || 'random').toLowerCase();
  return mode === 'random' ? 'random' : 'sequential';
}

function pickRandomTickets(availableNumbers, k) {
  // Partial Fisher-Yates shuffle to pick k items from the end
  const copy = [...availableNumbers];
  const n = copy.length;

  for (let i = n - 1; i >= n - k; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy.slice(n - k);
}

export async function reserveNumbersForPreference(orderId, tickets) {
  const availableNumbers = await getAvailableNumbers();
  if (availableNumbers.length < tickets) {
    const error = new Error('No hay suficientes rifas disponibles');
    error.code = 'INSUFFICIENT_STOCK';
    throw error;
  }

  const mode = getSelectionMode();
  const reservedNumbers = mode === 'random' ? pickRandomTickets(availableNumbers, tickets) : availableNumbers.splice(0, tickets);

  await setPendingNumbers(reservedNumbers);
  await addOrder(orderId, reservedNumbers);
  return reservedNumbers;
}

export async function releaseReservation(orderId) {
  const order = await getOrderById(orderId);
  if (order) {
    await releaseNumbersByOrder(order);
    await invalidateOrder(order);
  }
}

export async function confirmReservationAsSold(orderId, extraData = {}) {
  const order = await getOrderById(orderId);
  let soldOrder = null
  if (order) {
    await setSoldNumbers(order);
    soldOrder = await changeOrderStateToSold(order, extraData);
  }
  return soldOrder;
}
  


