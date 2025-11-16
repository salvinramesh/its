// auth.js
const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// LOGIN (JSON body or form)
router.post('/auth/login', express.json(), async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const client = await pool.connect();
    try {
      const q = 'SELECT id, username, password_hash, full_name, role FROM users WHERE username = $1';
      const r = await client.query(q, [username]);
      if (r.rowCount === 0) return res.status(401).json({ error: 'Invalid username or password' });

      const user = r.rows[0];
      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

      // create session
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.role = user.role;

      res.json({ success: true, username: user.username, full_name: user.full_name });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// LOGOUT
router.post('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Session destroy error', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    // clear cookie
    res.clearCookie('connect.sid', { path: '/' });
    res.json({ success: true });
  });
});

// Endpoint to return current user (for frontend)
router.get('/auth/me', (req, res) => {
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

module.exports = router;
