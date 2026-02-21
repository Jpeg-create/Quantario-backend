const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const { dbGet, dbRun } = require('../db/database');
const { generateToken } = require('../middleware/auth');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, error: 'Name, email and password are required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });

    const existing = dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing)
      return res.status(400).json({ success: false, error: 'An account with this email already exists' });

    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();
    dbRun('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)',
      [id, name, email.toLowerCase(), hashed]);

    const user = dbGet('SELECT id, name, email, avatar, created_at FROM users WHERE id = ?', [id]);
    const token = generateToken(user);
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: 'Email and password are required' });

    const user = dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user)
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    if (!user.password)
      return res.status(401).json({ success: false, error: 'This account uses Google login. Please sign in with Google.' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ success: false, error: 'Invalid email or password' });

    const token = generateToken(user);
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/google
// Frontend sends the Google ID token, we verify it and log the user in
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential)
      return res.status(400).json({ success: false, error: 'Google credential required' });

    if (!process.env.GOOGLE_CLIENT_ID)
      return res.status(500).json({ success: false, error: 'Google login not configured on server' });

    // Verify the token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user already exists
    let user = dbGet('SELECT * FROM users WHERE google_id = ? OR email = ?', [googleId, email.toLowerCase()]);

    if (user) {
      // Update google_id if they signed up with email before
      if (!user.google_id) {
        dbRun('UPDATE users SET google_id = ?, avatar = ? WHERE id = ?', [googleId, picture, user.id]);
      }
    } else {
      // New user — create account
      const id = uuidv4();
      dbRun('INSERT INTO users (id, name, email, google_id, avatar) VALUES (?, ?, ?, ?, ?)',
        [id, name, email.toLowerCase(), googleId, picture]);
      user = dbGet('SELECT * FROM users WHERE id = ?', [id]);
    }

    const token = generateToken(user);
    res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar || picture } });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Google authentication failed: ' + err.message });
  }
});

// GET /api/auth/me — get current logged in user
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ success: false, error: 'Not authenticated' });
    const jwt = require('jsonwebtoken');
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tradevault-secret-change-in-production');
    const user = dbGet('SELECT id, name, email, avatar, created_at FROM users WHERE id = ?', [decoded.id]);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

module.exports = router;
