const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { fetchTradesFromBroker } = require('../services/brokerService');

// GET /api/brokers
router.get('/', (req, res) => {
  try {
    const brokers = db.prepare(
      'SELECT id, broker_name, account_id, is_active, last_sync, created_at FROM broker_connections'
    ).all();
    res.json({ success: true, data: brokers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/brokers
router.post('/', (req, res) => {
  try {
    const { broker_name, api_key, api_secret, account_id } = req.body;
    if (!broker_name || !api_key) {
      return res.status(400).json({ success: false, error: 'broker_name and api_key are required' });
    }
    const id = uuidv4();
    db.prepare('INSERT INTO broker_connections (id, broker_name, api_key, api_secret, account_id) VALUES (?, ?, ?, ?, ?)')
      .run(id, broker_name, api_key, api_secret || null, account_id || null);
    res.status(201).json({ success: true, data: { id, broker_name, account_id } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/brokers/:id
router.delete('/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM broker_connections WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Broker connection removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/brokers/:id/sync
router.post('/:id/sync', async (req, res) => {
  try {
    const conn = db.prepare('SELECT * FROM broker_connections WHERE id = ?').get(req.params.id);
    if (!conn) return res.status(404).json({ success: false, error: 'Broker connection not found' });

    const rawTrades = await fetchTradesFromBroker(conn.broker_name, {
      api_key: conn.api_key,
      api_secret: conn.api_secret,
      account_id: conn.account_id,
      paper: req.body.paper || false
    });

    if (rawTrades.length === 0) {
      return res.json({ success: true, imported: 0, message: 'No new trades found' });
    }

    db.transaction((trades) => {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO trades
          (id, symbol, asset_type, direction, entry_price, exit_price, quantity,
           entry_date, exit_date, commission, broker, broker_trade_id, strategy, notes, pnl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      trades.forEach(t => {
        const pnl = t.pnl || ((t.exit_price - t.entry_price) * t.quantity * (t.direction === 'short' ? -1 : 1) - (t.commission || 0));
        stmt.run(uuidv4(), t.symbol, t.asset_type, t.direction, t.entry_price, t.exit_price,
          t.quantity, t.entry_date, t.exit_date, t.commission || 0,
          t.broker, t.broker_trade_id, t.strategy || null, t.notes || null,
          parseFloat(pnl.toFixed(8)));
      });
    })(rawTrades);

    db.prepare('UPDATE broker_connections SET last_sync = datetime("now") WHERE id = ?').run(req.params.id);
    res.json({ success: true, imported: rawTrades.length, broker: conn.broker_name });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/brokers/test
router.post('/test', async (req, res) => {
  try {
    const trades = await fetchTradesFromBroker(req.body.broker_name, req.body);
    res.json({ success: true, message: `Connected. Found ${trades.length} trades.` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
