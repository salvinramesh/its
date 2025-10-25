const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Employees ---
app.get('/api/employees', async (req, res) => {
  const rows = await db.allAsync('SELECT * FROM employees ORDER BY name');
  res.json(rows);
});

app.post('/api/employees', async (req, res) => {
  const { employee_id, name, email } = req.body;
  if(!employee_id || !name) return res.status(400).json({ error: 'employee_id and name required' });
  const stmt = await db.runAsync(
    'INSERT INTO employees (employee_id, name, email) VALUES (?,?,?)',
    [employee_id, name, email || null]
  );
  res.json({ id: stmt.lastID });
});

// --- Assets ---
app.get('/api/assets', async (req, res) => {
  const rows = await db.allAsync(
    `SELECT a.*, e.employee_id as assigned_employee_id, e.name as assigned_name, e.email as assigned_email
     FROM assets a
     LEFT JOIN employees e ON a.assigned_to = e.id
     ORDER BY a.id DESC`
  );
  res.json(rows);
});

app.get('/api/assets/:id', async (req, res) => {
  const id = req.params.id;
  const row = await db.getAsync('SELECT * FROM assets WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.post('/api/assets', async (req, res) => {
  const { asset_number, serial_number, type, assigned_to } = req.body;
  if(!asset_number || !type) return res.status(400).json({ error: 'asset_number and type required' });
  const stmt = await db.runAsync(
    'INSERT INTO assets (asset_number, serial_number, type, assigned_to) VALUES (?,?,?,?)',
    [asset_number, serial_number || null, type, assigned_to || null]
  );
  res.json({ id: stmt.lastID });
});

app.put('/api/assets/:id', async (req, res) => {
  const id = req.params.id;
  const { asset_number, serial_number, type, assigned_to } = req.body;
  await db.runAsync(
    'UPDATE assets SET asset_number=?, serial_number=?, type=?, assigned_to=? WHERE id=?',
    [asset_number, serial_number || null, type, assigned_to || null, id]
  );
  res.json({ ok: true });
});

app.delete('/api/assets/:id', async (req, res) => {
  const id = req.params.id;
  await db.runAsync('DELETE FROM assets WHERE id = ?', [id]);
  res.json({ ok: true });
});

// --- Search ---
app.get('/api/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if(!q) return res.json([]);
  const like = '%' + q + '%';
  const rows = await db.allAsync(
    `SELECT a.*, e.employee_id as assigned_employee_id, e.name as assigned_name, e.email as assigned_email
     FROM assets a
     LEFT JOIN employees e ON a.assigned_to = e.id
     WHERE a.asset_number LIKE ? OR a.serial_number LIKE ? OR a.type LIKE ? OR e.name LIKE ? OR e.employee_id LIKE ?`,
    [like, like, like, like, like]
  );
  res.json(rows);
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
