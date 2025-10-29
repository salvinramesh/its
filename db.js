// db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // optional tuning:
  // max: 20,
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 2000
});

async function query(text, params = []) {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  // returns single row or null
  get: async (sql, params = []) => {
    const res = await query(sql, params);
    return res.rows[0] || null;
  },
  // returns rows array
  all: async (sql, params = []) => {
    const res = await query(sql, params);
    return res.rows;
  },
  // run a statement and return the full result
  run: async (sql, params = []) => {
    return query(sql, params);
  },
  pool, // expose pool if you need transactions or graceful shutdown
};
