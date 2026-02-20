require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const tradesRouter  = require('./routes/trades');
const journalRouter = require('./routes/journal');
const importRouter  = require('./routes/import');
const brokersRouter = require('./routes/brokers');
const errorHandler  = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ─────────────────────────────────────────────────
// This is what lets your Vercel frontend talk to this Render backend.
// Without this, browsers block cross-origin requests for security.
const allowedOrigins = [
  process.env.FRONTEND_URL,          // your Vercel URL from .env
  'http://localhost:5500',           // VS Code Live Server
  'http://localhost:3000',           // local backend serving frontend
  'http://127.0.0.1:5500',
].filter(Boolean); // removes undefined/empty values

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ── BODY PARSING ─────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── API ROUTES ───────────────────────────────────────────
app.use('/api/trades',  tradesRouter);
app.use('/api/journal', journalRouter);
app.use('/api/import',  importRouter);
app.use('/api/brokers', brokersRouter);

// ── HEALTH CHECK ─────────────────────────────────────────
// Render pings this to confirm the server is alive
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── ROOT ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'TradeVault API is running. Frontend is on Vercel.' });
});

// ── ERROR HANDLER (must be last) ─────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 TradeVault API running on http://localhost:${PORT}`);
  console.log(`🌐 Allowed frontend origin: ${process.env.FRONTEND_URL || 'not set'}`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
