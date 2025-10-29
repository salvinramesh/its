// scripts/init-db.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../db');

async function apply() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001-init.sql'), 'utf8');
    await db.run(sql);
    console.log('Migrations applied');
    // optionally close pool:
    await db.pool.end();
  } catch (err) {
    console.error('Migration error', err);
    process.exit(1);
  }
}

apply();
