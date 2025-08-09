import fs from 'fs/promises';
import path from 'path';

// Base directory for data files (project root + server/data)
const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const FILE_AVAILABLE = path.join(DATA_DIR, 'rifas_available.json');
const FILE_PENDING = path.join(DATA_DIR, 'rifas_pending.json');
const FILE_SOLD = path.join(DATA_DIR, 'rifas_sold.json');

export async function initStorage() {
  await ensureDataFiles();
}

async function ensureDataFiles() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const files = [FILE_AVAILABLE, FILE_PENDING, FILE_SOLD];
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

export async function getAvailableNumbers() {
  return readJson(FILE_AVAILABLE, []);
}

export async function setAvailableNumbers(numbers) {
  await writeJson(FILE_AVAILABLE, numbers);
}

export async function getPendingEntries() {
  return readJson(FILE_PENDING, []);
}

export async function setPendingEntries(entries) {
  await writeJson(FILE_PENDING, entries);
}

export async function appendSoldEntry(entry) {
  const sold = await readJson(FILE_SOLD, []);
  sold.push(entry);
  await writeJson(FILE_SOLD, sold);
}

export async function getSoldEntries() {
  return readJson(FILE_SOLD, []);
}

function getSelectionMode() {
  const mode = (process.env.RIFA_SELECTION_MODE || 'random').toLowerCase();
  return mode === 'random' ? 'random' : 'sequential';
}

function pickAndRemoveRandom(available, k) {
  // Partial Fisher-Yates shuffle to pick k items from the end
  const n = available.length;
  for (let i = n - 1; i >= n - k; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = available[i];
    available[i] = available[j];
    available[j] = tmp;
  }
  const start = n - k;
  const reserved = available.slice(start);
  available.splice(start, k);
  return reserved;
}

export async function reserveNumbersForPreference(externalRef, tickets) {
  const available = await getAvailableNumbers();
  if (available.length < tickets) {
    const error = new Error('No hay suficientes rifas disponibles');
    error.code = 'INSUFFICIENT_STOCK';
    throw error;
  }

  const mode = getSelectionMode();
  const reserved = mode === 'random' ? pickAndRemoveRandom(available, tickets) : available.splice(0, tickets);

  await setAvailableNumbers(available);

  const pending = await getPendingEntries();
  pending.push({
    id: externalRef,
    numbers: reserved,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
  await setPendingEntries(pending);
  return reserved;
}

export async function releaseReservation(externalRef) {
  const pending = await getPendingEntries();
  const index = pending.findIndex((p) => p.id === externalRef);
  if (index === -1) return;
  const [entry] = pending.splice(index, 1);
  await setPendingEntries(pending);
  const available = await getAvailableNumbers();
  const updated = [...entry.numbers, ...available];
  await setAvailableNumbers(updated);
}

export async function confirmReservationAsSold(externalRef, extra = {}) {
  const pending = await getPendingEntries();
  const index = pending.findIndex((p) => p.id === externalRef);
  if (index === -1) return null;
  const [entry] = pending.splice(index, 1);
  await setPendingEntries(pending);

  const soldEntry = {
    ...entry,
    status: 'paid',
    soldAt: new Date().toISOString(),
    ...extra,
  };
  await appendSoldEntry(soldEntry);
  return soldEntry;
}


