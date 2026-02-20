const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');

router.get('/', (req, res) => {
  try {
    const entries = db.prepare('SELECT * FROM journal_entries ORDER BY entry_date DESC').all();
    res.json({ success: true, data: entries, count: entries.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { entry_date, content } = req.body;
    if (!entry_date || !content) {
      return res.status(400).json({ success: false, error: 'entry_date and content are required' });
    }
    const id = uuidv4();
    db.prepare('INSERT INTO journal_entries (id, entry_date, content) VALUES (?, ?, ?)').run(id, entry_date, content);
    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(id);
    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { entry_date, content } = req.body;
    const result = db.prepare('UPDATE journal_entries SET entry_date=?, content=? WHERE id=?').run(entry_date, content, req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Entry not found' });
    const entry = db.prepare('SELECT * FROM journal_entries WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM journal_entries WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Entry not found' });
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
