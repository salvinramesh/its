const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.sqlite');

let dbPromise = (async () => {
  const db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });
  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_number TEXT UNIQUE NOT NULL,
      serial_number TEXT,
      type TEXT NOT NULL,
      assigned_to INTEGER,
      FOREIGN KEY (assigned_to) REFERENCES employees(id) ON DELETE SET NULL
    );
  `);
  return db;
})();

module.exports = {
  getAsync: async (sql, params=[]) => {
    const db = await dbPromise;
    return db.get(sql, params);
  },
  allAsync: async (sql, params=[]) => {
    const db = await dbPromise;
    return db.all(sql, params);
  },
  runAsync: async (sql, params=[]) => {
    const db = await dbPromise;
    return db.run(sql, params);
  }
};
