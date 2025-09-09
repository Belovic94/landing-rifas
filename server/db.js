import pkg from "pg";
const { Pool } = pkg;

let pool;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}