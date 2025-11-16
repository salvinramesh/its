// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const bcrypt = require('bcrypt');

const db = require('./db'); // expects { pool, all, get, run }
const app = express();
const PORT = process.env.PORT || 3000;

// If behind a proxy (nginx) and using HTTPS in prod, enable trust proxy
if (process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// Basic hardening and logging
// Disable helmet's contentSecurityPolicy here because we use external scripts and may want to re-enable with proper nonces later
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiter (global)
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const MAX_REQ = parseInt(process.env.RATE_LIMIT_MAX || '200', 10);
app.use(rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQ,
  message: { error: 'Too many requests' }
}));

// --- Sessions (Postgres-backed) ---
if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET not set in environment. Exiting.');
  process.exit(1);
}
if (!db || !db.pool) {
  console.error('db.pool not available. Ensure ./db exports { pool, all, get, run }');
  process.exit(1);
}

app.use(session({
  store: new PgSession({
    pool: db.pool,
    tableName: 'session'
  }),
  name: process.env.SESSION_COOKIE_NAME || 'connect.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE_MS || String(24 * 60 * 60 * 1000), 10),
    httpOnly: true,
    sameSite: 'lax',
    // secure: true // enable in production when using HTTPS
  }
}));

// Helper to await session save
function saveSession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) return resolve();
    req.session.save(err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// Helper to detect AJAX/JSON/fetch requests robustly
function isAjaxRequest(req) {
  const accept = (req.get('Accept') || '').toLowerCase();
  const contentType = (req.get('Content-Type') || '').toLowerCase();
  const xreq = (req.get('X-Requested-With') || '').toLowerCase();
  return accept.includes('application/json') ||
         contentType.includes('application/json') ||
         xreq === 'xmlhttprequest' ||
         !!req.xhr;
}

// --- Auth routes ---
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, try again later.' }
});

app.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const username = (req.body && req.body.username) || '';
    const password = (req.body && req.body.password) || '';

    const wantsJson = isAjaxRequest(req);

    if (!username || !password) {
      console.warn('Login attempt with missing credentials');
      if (wantsJson) return res.status(400).json({ error: 'username and password required' });
      return res.redirect('/login.html?error=missing');
    }

    // Query user
    let r;
    try {
      r = await db.pool.query('SELECT id, username, password_hash, full_name, role FROM users WHERE username = $1 LIMIT 1', [username]);
    } catch (dbqErr) {
      console.error('DB query error during login:', dbqErr);
      if (wantsJson) return res.status(500).json({ error: 'Internal server error' });
      return res.redirect('/login.html?error=server');
    }

    if (!r || r.rowCount === 0) {
      console.warn('Login failed - user not found:', username);
      if (wantsJson) return res.status(401).json({ error: 'Invalid username or password' });
      return res.redirect('/login.html?error=invalid');
    }

    const user = r.rows[0];
    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptErr) {
      console.error('bcrypt compare error:', bcryptErr);
      if (wantsJson) return res.status(500).json({ error: 'Internal server error' });
      return res.redirect('/login.html?error=server');
    }

    if (!ok) {
      console.warn('Login failed - invalid password for user:', username);
      if (wantsJson) return res.status(401).json({ error: 'Invalid username or password' });
      return res.redirect('/login.html?error=invalid');
    }

    // Set session fields
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role || 'user';

    // Save session to ensure cookie & session row persisted before responding
    try {
      await saveSession(req);
    } catch (saveErr) {
      console.error('Failed to save session before responding:', saveErr);
      if (wantsJson) return res.status(500).json({ error: 'Failed to create session' });
      return res.redirect('/login.html?error=server');
    }

    if (wantsJson) {
      return res.json({ success: true, username: user.username, full_name: user.full_name });
    } else {
      return res.redirect('/');
    }
  } catch (err) {
    console.error('POST /auth/login error', err);
    const wantsJson = isAjaxRequest(req);
    if (wantsJson) return res.status(500).json({ error: 'Internal server error' });
    return res.redirect('/login.html?error=server');
  }
});

app.post('/auth/logout', (req, res) => {
  try {
    req.session.destroy(err => {
      if (err) {
        console.error('Session destroy error', err);
        return res.status(500).json({ error: 'Failed to logout' });
      }
      res.clearCookie(process.env.SESSION_COOKIE_NAME || 'connect.sid', { path: '/' });
      res.json({ success: true });
    });
  } catch (err) {
    console.error('POST /auth/logout error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/auth/me', (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ loggedIn: false });
  res.json({
    loggedIn: true,
    user: {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role
    }
  });
});

// --- Authentication middleware ---
const whitelistPrefixes = [
  '/auth',
  '/login.html',
  '/login.css',
  '/login.js',
  '/favicon.ico',
  '/static/',
  '/assets/',
  '/public/'
];
const allowedExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.map', '.json'];

app.use((req, res, next) => {
  const lower = req.path.toLowerCase();
  const isWhitelisted = whitelistPrefixes.some(p => lower.startsWith(p));
  const extAllowed = allowedExtensions.some(ext => lower.endsWith(ext));
  if (isWhitelisted || extAllowed) return next();
  if (req.session && req.session.userId) return next();
  if (req.method === 'GET') return res.redirect('/login.html');
  return res.status(401).json({ error: 'authentication required' });
});

// Serve static files (after auth middleware)
app.use(express.static(path.join(__dirname, 'public')));

/* ===========================
   Employees routes (unchanged)
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
    if (err && err.code === '23505') return res.status(409).json({ error: 'employee_id already exists' });
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
    if (err && err.code === '23505') return res.status(409).json({ error: 'employee_id already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });

    await db.run('UPDATE assets SET assigned_to = NULL WHERE assigned_to = $1', [id]);
    await db.run('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/employees/:id error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/* ===========================
   Assets routes (unchanged)
   =========================== */

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

app.post('/api/assets', async (req, res) => {
  try {
    const { asset_number, serial_number, type, assigned_to, laptop_details } = req.body;
    if (!asset_number || !type) return res.status(400).json({ error: 'asset_number and type required' });

    const result = await db.run(
      'INSERT INTO assets (asset_number, serial_number, type, assigned_to, laptop_details) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [asset_number, serial_number || null, type, assigned_to || null, laptop_details || null]
    );

    res.status(201).json({ id: result.rows[0].id });
  } catch (err) {
    console.error('POST /api/assets error', err);
    if (err && err.code === '23505') return res.status(409).json({ error: 'asset_number already exists' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
   Search (unchanged)
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
   SPA fallback + graceful shutdown
   =========================== */

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// graceful shutdown: close DB pool on SIGINT / SIGTERM
const shutdown = async () => {
  console.log('Shutting down, closing DB pool');
  try {
    if (db && db.pool) await db.pool.end();
  } catch (e) {
    console.error('Error closing DB pool', e);
  }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
