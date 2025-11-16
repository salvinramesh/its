// create_admin.js
// Usage examples:
//   DATABASE_URL=... node create_admin.js admin mypassword "Admin Name"
//   or set env vars and run: node create_admin.js

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const args = process.argv.slice(2);
    const username = args[0] || process.env.ADMIN_USERNAME || 'admin';
    const password = args[1] || process.env.ADMIN_PASSWORD || 'adminpass';
    const fullName = args[2] || process.env.ADMIN_FULLNAME || 'Administrator';

    if (!username || !password) {
      console.error('Usage: node create_admin.js <username> <password> [fullName]');
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const client = await pool.connect();
    try {
      const insertSql = `INSERT INTO users (username, password_hash, full_name, role) VALUES ($1, $2, $3, 'admin') RETURNING id`;
      const res = await client.query(insertSql, [username, passwordHash, fullName]);
      console.log('Created admin user id=', res.rows[0].id);
    } catch (err) {
      if (err.code === '23505') {
        console.error('User already exists. Use a different username or update password manually.');
      } else {
        console.error('Insert error:', err);
      }
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
