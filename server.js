// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ===========================
   Employees
   =========================== */

// list employees
app.get('/api/employees', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM employees ORDER BY name');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/employees error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// create employee
app.post('/api/employees', async (req, res) => {
  try {
    const { employee_id, name, email } = req.body;
    if (!employee_id || !name) return res.status(400).json({ error: 'employee_id and name required' });

    const result = await db.run(
      'INSERT INTO employees (employee_id, name, email) VALUES ($1, $2, $3) RETURNING id',
      [employee_id, name, email || null]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('POST /api/employees error', err);
    if (err.code === '23505') return res.status(409).json({ error: 'employee_id already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// get single employee
app.get('/api/employees/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const row = await db.get('SELECT * FROM employees WHERE id = $1', [id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error('GET /api/employees/:id error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// get assets assigned to a specific employee
app.get('/api/employees/:id/assets', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const rows = await db.all(
      `SELECT a.*, e.employee_id as assigned_employee_id, e.name as assigned_name, e.email as assigned_email
       FROM assets a
       LEFT JOIN employees e ON a.assigned_to = e.id
       WHERE a.assigned_to = $1
       ORDER BY a.id DESC`,
      [id]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/employees/:id/assets error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { employee_id, name, email } = req.body;
    if (!employee_id || !name) return res.status(400).json({ error: 'employee_id and name required' });

    const result = await db.run(
      `UPDATE employees
       SET employee_id = $1, name = $2, email = $3
       WHERE id = $4
       RETURNING id, employee_id, name, email`,
      [employee_id, name, email || null, id]
    );

    if (!result.rows || result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, employee: result.rows[0] });
  } catch (err) {
    console.error('PUT /api/employees/:id error', err);
    if (err.code === '23505') return res.status(409).json({ error: 'employee_id already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    // Unassign assets first (optional): set assigned_to = NULL for assets assigned to this employee
    await db.run('UPDATE assets SET assigned_to = NULL WHERE assigned_to = $1', [id]);

    // Then remove employee
    await db.run('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/employees/:id error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ===========================
   Assets
   =========================== */

/**
 * GET /api/assets
 * Return list of assets with joined employee info (assigned_name, assigned_employee_id)
 */
app.get('/api/assets', async (req, res) => {
  try {
    const rows = await db.all(
      `SELECT a.*, e.employee_id as assigned_employee_id, e.name as assigned_name, e.email as assigned_email
       FROM assets a
       LEFT JOIN employees e ON a.assigned_to = e.id
       ORDER BY a.id DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/assets error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/assets/:id
 * Return single asset (joined) so UI can read laptop_details + assigned_name
 */
app.get('/api/assets/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const row = await db.get(
      `SELECT a.*, e.employee_id as assigned_employee_id, e.name as assigned_name, e.email as assigned_email
       FROM assets a
       LEFT JOIN employees e ON a.assigned_to = e.id
       WHERE a.id = $1
       LIMIT 1`,
      [id]
    );

    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) {
    console.error('GET /api/assets/:id error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/assets
 * Accepts optional laptop_details (JSON object) and persists it to assets.laptop_details (JSONB)
 */
app.post('/api/assets', async (req, res) => {
  try {
    const { asset_number, serial_number, type, assigned_to, laptop_details } = req.body;
    if (!asset_number || !type) return res.status(400).json({ error: 'asset_number and type required' });

    // Insert including laptop_details (will be stored as jsonb if the column is jsonb)
    const result = await db.run(
      'INSERT INTO assets (asset_number, serial_number, type, assigned_to, laptop_details) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [asset_number, serial_number || null, type, assigned_to || null, laptop_details || null]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('POST /api/assets error', err);
    if (err.code === '23505') return res.status(409).json({ error: 'asset_number already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// update asset (full replace semantics), also persist laptop_details
app.put('/api/assets/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    const { asset_number, serial_number, type, assigned_to, laptop_details } = req.body;

    await db.run(
      'UPDATE assets SET asset_number=$1, serial_number=$2, type=$3, assigned_to=$4, laptop_details=$5 WHERE id=$6',
      [asset_number, serial_number || null, type, assigned_to || null, laptop_details || null, id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/assets/:id error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/assets/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await db.run('DELETE FROM assets WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/assets/:id error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ===========================
   Search
   =========================== */

app.get('/api/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const like = `%${q}%`;
    const rows = await db.all(
      `SELECT a.*, e.employee_id as assigned_employee_id, e.name as assigned_name, e.email as assigned_email
       FROM assets a
       LEFT JOIN employees e ON a.assigned_to = e.id
       WHERE a.asset_number ILIKE $1 OR a.serial_number ILIKE $2 OR a.type ILIKE $3 OR e.name ILIKE $4 OR e.employee_id ILIKE $5
       ORDER BY a.id DESC`,
      [like, like, like, like, like]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/search error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ===========================
   SPA fallback + shutdown
   =========================== */

// Fallback to index.html for SPA routes (make sure public/index.html exists)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down, closing DB pool');
  try {
    await db.pool.end();
  } catch (e) {
    // ignore
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
