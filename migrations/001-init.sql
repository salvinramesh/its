-- migrations/001-init.sql
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT
);

CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  asset_number TEXT UNIQUE NOT NULL,
  serial_number TEXT,
  type TEXT NOT NULL,
  assigned_to INTEGER REFERENCES employees(id) ON DELETE SET NULL
);
