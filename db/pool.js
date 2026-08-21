import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// A pool, not a single client — Apollo will handle many concurrent
// requests, and one shared client would serialize all your queries.
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // fail fast instead of hanging the process if Postgres is unreachable
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  // Idle client errors (e.g. DB restart) — log, don't crash the server
  console.error('Unexpected error on idle Postgres client', err);
});
