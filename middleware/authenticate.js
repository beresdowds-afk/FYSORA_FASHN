// middleware/authenticate.js
const { authenticate, checkAppAccessMiddleware } = require('../middleware/authenticate');

// Example: only customers can access certain endpoints
router.get('/customer-data', authenticate, checkAppAccessMiddleware(['customer']), (req, res) => {
  res.json({ data: 'Customer only' });
});const { verifyAccessToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ error: 'No access token' });

  const decoded = verifyAccessToken(token);
  if (!decoded) return res.status(403).json({ error: 'Invalid or expired token' });

  req.user = decoded; // attach user info
  next();
}

// Middleware to check application‑specific access
function checkAppAccessMiddleware(allowedRoles) {
  return (req, res, next) => {
    const user = req.user;
    if (!user) return res.status(401).json({ error: 'Unauthenticated' });

    // If allowedRoles is an array, check intersection
    if (allowedRoles && !user.roles.some(r => allowedRoles.includes(r))) {
      return res.status(403).json({ error: 'Insufficient permissions for this application' });
    }

    // Additionally, enforce the cross-app restrictions using the helper
    const appOrigin = req.get('Origin') || req.get('Referer') || '';
    const allowed = checkAppAccess(user.roles, appOrigin);
    if (!allowed) {
      return res.status(403).json({ error: 'You are not allowed to access this application.' });
    }

    next();
  };
}

module.exports = { authenticate, checkAppAccessMiddleware };
