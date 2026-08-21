import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  const seed = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf-8');

  await pool.query(schema);
  console.log('Schema applied.');

  await pool.query(seed);
  console.log('Seed data inserted.');

  await pool.end();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
