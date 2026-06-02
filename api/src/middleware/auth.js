import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'engage-socially-jwt-secret-change-me';

/**
 * Create a JWT token for a user
 */
export function createToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Express middleware: require a valid JWT in Authorization header.
 * Attaches decoded user to `req.user` and sets `req.userId`.
 */
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Express middleware: require the user to have admin role.
 * Must be used after requireAuth.
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}
