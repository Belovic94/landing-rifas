import pkg from "pg";
const { Pool } = pkg;

let pool;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "prod" ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export async function initDatabase(db, reset = false) {
  const client = await db.connect();

  try {
    console.log("🛠️ initDatabase: start", reset ? "(RESET ENABLED)" : "");
    await client.query("BEGIN");

    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    if (reset) {
      console.log("🧨 Reset: borrando tablas...");
      await client.query(`DROP TABLE IF EXISTS order_tickets CASCADE;`);
      await client.query(`DROP TABLE IF EXISTS tickets CASCADE;`);
      await client.query(`DROP TABLE IF EXISTS orders CASCADE;`);
    }

    // tickets catálogo
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        number CHAR(4) PRIMARY KEY
      );
    `);

    // orders
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        email VARCHAR(255),
        amount NUMERIC(10,2),
        payment_id VARCHAR(255),
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // historial / reservas
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_tickets (
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        ticket_number CHAR(4) NOT NULL REFERENCES tickets(number),
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        released_at TIMESTAMPTZ NULL,
        release_reason VARCHAR(20) NULL,
        PRIMARY KEY (order_id, ticket_number)
      );
    `);

    // Índices
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_order_tickets_order_id ON order_tickets(order_id);`);

    // Exclusividad: un ticket activo en una sola orden
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_ticket_active_reservation
      ON order_tickets(ticket_number)
      WHERE released_at IS NULL;
    `);

    // Seed tickets
    const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM tickets`);

    if (rows[0].count === 0) {
      const TOTAL = 10000;
      console.log("🎟️ Seedeando tickets...");

      await client.query(
        `INSERT INTO tickets (number)
         SELECT LPAD(generate_series(0, $1 - 1)::text, 4, '0')::char(4);`,
        [TOTAL]
      );

      console.log(`✅ Tickets generados: ${TOTAL}`);
    } else {
      console.log(`ℹ️ Tickets ya existen (${rows[0].count}), no se seedea`);
    }

    await client.query("COMMIT");
    console.log("✅ initDatabase: OK");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ initDatabase: ERROR", err);
    throw err;
  } finally {
    client.release();
  }
}