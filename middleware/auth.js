const jwt = require('jsonwebtoken');

// Single source of truth for the JWT secret — both sign and verify use this.
// Server.js already crashes in production if JWT_SECRET is missing.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-not-for-production';

// Middleware that checks every request for a valid JWT token
// If valid, it adds the user info to req.user so routes can access it
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided. Please log in.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, name }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token. Please log in again.' });
  }
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, plan: user.plan || 'free' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function requirePremium(req, res, next) {
  if (req.user.plan !== 'premium') {
    return res.status(403).json({
      success: false,
      error: 'This feature requires a Quantario Premium plan.',
      upgrade: true,
    });
  }
  next();
}

module.exports = { requireAuth, requirePremium, generateToken, JWT_SECRET };
