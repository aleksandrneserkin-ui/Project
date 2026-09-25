import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  host:     process.env.PGHOST,
  port:     Number(process.env.PGPORT),
  user:     process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  max: 10,
  idleTimeoutMillis: 30_000,
});

/**
 * ЕДИНСТВЕННЫЙ способ общения с БД.
 * ВСЕГДА используем параметры $1, $2, ... — никакой склейки строк.
 */
export function query(text, params) {
  return pool.query(text, params);
}