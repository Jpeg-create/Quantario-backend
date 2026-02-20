function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (err.message === 'Only CSV files allowed') {
    return res.status(400).json({ success: false, error: err.message });
  }
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
