// db/db.js
import pkg from "pg";
import bcrypt from "bcryptjs";
import { logger } from "./utils/logger.js";

const { Pool } = pkg;

let pool;

export function getDb() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "prod"
          ? { rejectUnauthorized: false }
          : false,
    });

    logger.info(
      {
        ssl: !!pool.options.ssl,
      },
      "[DB] pool initialized"
    );
  }

  return pool;
}

export async function initDatabase(db, reset = false) {
  const log = logger.child({ module: "db", action: "init" });
  const startedAt = Date.now();

  const client = await db.connect();

  try {
    log.info({ reset }, "[DB] initDatabase start");

    await client.query("BEGIN");

    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    if (reset) {
      log.warn("RESET ENABLED: dropping tables");

      await client.query(`DROP TABLE IF EXISTS order_tickets CASCADE;`);
      await client.query(`DROP TABLE IF EXISTS tickets CASCADE;`);
      await client.query(`DROP TABLE IF EXISTS orders CASCADE;`);
      await client.query(`DROP TABLE IF EXISTS users CASCADE;`);
    }

    // users (panel admin)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'viewer')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

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

    // índices
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_expires_at ON orders(expires_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_order_tickets_order_id ON order_tickets(order_id);`);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_ticket_active_reservation
      ON order_tickets(ticket_number)
      WHERE released_at IS NULL;
    `);

    // Seed tickets
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count FROM tickets`
    );

    if (rows[0].count === 0) {
      const TOTAL = 10000;

      log.info({ total: TOTAL }, "[DB] seeding tickets");

      await client.query(
        `INSERT INTO tickets (number)
         SELECT LPAD(generate_series(0, $1 - 1)::text, 4, '0')::char(4);`,
        [TOTAL]
      );

      log.info({ total: TOTAL }, "[DB] tickets seeded");
    } else {
      log.info(
        { existing: rows[0].count },
        "[DB] tickets already exist, skipping seed"
      );
    }

    // Seed users (admin + analytics) — idempotente
    const { rows: userRows } = await client.query(
      `SELECT COUNT(*)::int AS count FROM users`
    );

    if (userRows[0].count === 0) {
      const adminPassword = process.env.ADMIN_PASSWORD;
      const analyticsPassword = process.env.ANALYTICS_PASSWORD;

      log.info("[DB] seeding users (admin + analytics)");

      const adminHash = await bcrypt.hash(adminPassword, 10);
      const analyticsHash = await bcrypt.hash(analyticsPassword, 10);

      await client.query(
        `
        INSERT INTO users (username, name, password_hash, role)
        VALUES
          ($1, $2, $3, $4),
          ($5, $6, $7, $8)
        ON CONFLICT (username) DO NOTHING
        `,
        [
          "admin", "Administrador", adminHash, "admin",
          "analytics", "Estadísticas", analyticsHash, "viewer",
        ]
      );

      log.warn(
        { adminUsername: "admin", analyticsUsername: "analytics" },
        "[DB] users seeded (set ADMIN_PASSWORD / ANALYTICS_PASSWORD in env)"
      );
    } else {
      log.info(
        { existing: userRows[0].count },
        "[DB] users already exist, skipping seed"
      );
    }

    await client.query("COMMIT");

    log.info(
      { durationMs: Date.now() - startedAt },
      "[DB] initDatabase completed"
    );
  } catch (err) {
    await client.query("ROLLBACK");

    log.error(
      { err, durationMs: Date.now() - startedAt },
      "[DB] initDatabase failed"
    );

    throw err;
  } finally {
    client.release();
  }
}
