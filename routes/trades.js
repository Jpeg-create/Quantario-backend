const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

// GET /api/trades
router.get('/', (req, res) => {
  try {
    const { asset_type, direction, limit, offset } = req.query;
    let query = 'SELECT * FROM trades WHERE 1=1';
    const params = [];

    if (asset_type && asset_type !== 'all') { query += ' AND asset_type = ?'; params.push(asset_type); }
    if (direction  && direction  !== 'all') { query += ' AND direction = ?';  params.push(direction); }

    query += ' ORDER BY created_at DESC';
    if (limit)  { query += ' LIMIT ?';  params.push(parseInt(limit)); }
    if (offset) { query += ' OFFSET ?'; params.push(parseInt(offset)); }

    const trades = db.prepare(query).all(...params);
    res.json({ success: true, data: trades, count: trades.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trades/stats/summary  ← must be BEFORE /:id route
router.get('/stats/summary', (req, res) => {
  try {
    const trades = db.prepare('SELECT * FROM trades').all();
    const winning = trades.filter(t => t.pnl > 0);
    const losing  = trades.filter(t => t.pnl < 0);
    const totalPnL    = trades.reduce((s, t) => s + t.pnl, 0);
    const totalWins   = winning.reduce((s, t) => s + t.pnl, 0);
    const totalLosses = Math.abs(losing.reduce((s, t) => s + t.pnl, 0));
    const avgWin  = winning.length ? totalWins / winning.length : 0;
    const avgLoss = losing.length  ? totalLosses / losing.length : 0;

    res.json({
      success: true,
      data: {
        totalTrades: trades.length,
        totalPnL:    parseFloat(totalPnL.toFixed(2)),
        winningTrades: winning.length,
        losingTrades:  losing.length,
        winRate:      trades.length ? parseFloat(((winning.length / trades.length) * 100).toFixed(1)) : 0,
        avgWin:       parseFloat(avgWin.toFixed(2)),
        avgLoss:      parseFloat(avgLoss.toFixed(2)),
        profitFactor: totalLosses > 0 ? parseFloat((totalWins / totalLosses).toFixed(2)) : null,
        rMultiple:    avgLoss > 0 ? parseFloat((avgWin / avgLoss).toFixed(2)) : null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trades/:id
router.get('/:id', (req, res) => {
  try {
    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
    if (!trade) return res.status(404).json({ success: false, error: 'Trade not found' });
    res.json({ success: true, data: trade });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trades
router.post('/', (req, res) => {
  try {
    const {
      symbol, asset_type = 'stock', direction = 'long',
      entry_price, exit_price, quantity,
      entry_date, exit_date, stop_loss, take_profit,
      strategy, notes, commission = 0, market_conditions,
      broker = 'manual', broker_trade_id
    } = req.body;

    if (!symbol || entry_price == null || exit_price == null || quantity == null) {
      return res.status(400).json({ success: false, error: 'symbol, entry_price, exit_price, and quantity are required' });
    }

    const pnl = (parseFloat(exit_price) - parseFloat(entry_price))
      * parseFloat(quantity)
      * (direction === 'short' ? -1 : 1)
      - parseFloat(commission || 0);

    const id = uuidv4();
    db.prepare(`
      INSERT INTO trades
        (id, symbol, asset_type, direction, entry_price, exit_price, quantity,
         entry_date, exit_date, stop_loss, take_profit, strategy, notes,
         commission, market_conditions, pnl, broker, broker_trade_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, symbol.toUpperCase(), asset_type, direction,
      entry_price, exit_price, quantity,
      entry_date || null, exit_date || null,
      stop_loss || null, take_profit || null,
      strategy || null, notes || null,
      commission, market_conditions || null,
      parseFloat(pnl.toFixed(8)), broker, broker_trade_id || null
    );

    const trade = db.prepare('SELECT * FROM trades WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: trade });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/trades/bulk
router.post('/bulk', (req, res) => {
  try {
    const { trades } = req.body;
    if (!Array.isArray(trades) || trades.length === 0) {
      return res.status(400).json({ success: false, error: 'trades array is required' });
    }

    const insertMany = db.transaction((rows) => {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO trades
          (id, symbol, asset_type, direction, entry_price, exit_price, quantity,
           entry_date, exit_date, stop_loss, take_profit, strategy, notes,
           commission, market_conditions, pnl, broker, broker_trade_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      rows.forEach(t => {
        const pnl = t.pnl != null ? t.pnl :
          (parseFloat(t.exit_price) - parseFloat(t.entry_price))
          * parseFloat(t.quantity)
          * (t.direction === 'short' ? -1 : 1)
          - parseFloat(t.commission || 0);

        stmt.run(
          t.id || uuidv4(),
          (t.symbol || '').toUpperCase(), t.asset_type || 'stock', t.direction || 'long',
          t.entry_price, t.exit_price, t.quantity,
          t.entry_date || null, t.exit_date || null,
          t.stop_loss || null, t.take_profit || null,
          t.strategy || null, t.notes || null,
          t.commission || 0, t.market_conditions || null,
          parseFloat(parseFloat(pnl).toFixed(8)),
          t.broker || 'manual', t.broker_trade_id || null
        );
      });
    });

    insertMany(trades);
    res.status(201).json({ success: true, inserted: trades.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/trades/:id
router.put('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'Trade not found' });

    const f = { ...existing, ...req.body };
    const pnl = (parseFloat(f.exit_price) - parseFloat(f.entry_price))
      * parseFloat(f.quantity)
      * (f.direction === 'short' ? -1 : 1)
      - parseFloat(f.commission || 0);

    db.prepare(`
      UPDATE trades SET
        symbol=?, asset_type=?, direction=?, entry_price=?, exit_price=?,
        quantity=?, entry_date=?, exit_date=?, stop_loss=?, take_profit=?,
        strategy=?, notes=?, commission=?, market_conditions=?, pnl=?
      WHERE id=?
    `).run(
      f.symbol, f.asset_type, f.direction, f.entry_price, f.exit_price,
      f.quantity, f.entry_date, f.exit_date, f.stop_loss, f.take_profit,
      f.strategy, f.notes, f.commission, f.market_conditions,
      parseFloat(pnl.toFixed(8)), req.params.id
    );

    const updated = db.prepare('SELECT * FROM trades WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/trades/:id
router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM trades WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Trade not found' });
    res.json({ success: true, message: 'Trade deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
