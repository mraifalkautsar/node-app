const { verifyAccessToken } = require('../utils/jwt');

/**
 * Middleware to verify JWT access token
 */
const authenticateAdmin = async (req, res, next) => {

  if (process.env.SKIP_AUTH === 'true') {
    req.user = {
      user_id: 1,
      email: 'admin@dev.local',
      role: 'ADMIN',
      name: 'Dev Admin',
    };
    return next();
  }

  try {
    const authHeader = (req.headers.authorization || (req.get && req.get('Authorization')) || '').trim();

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
      if (acceptsHtml && typeof res.redirect === 'function') {
        return res.redirect('/app/login');
      }

      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    const token = authHeader.substring(7).trim();
    
    const decoded = await verifyAccessToken(token);
    
    // Verify user is an admin
    if (decoded.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Admin role required.',
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    const acceptsHtml = req.headers.accept && req.headers.accept.includes('text/html');
    if (acceptsHtml && typeof res.redirect === 'function') {
      return res.redirect('/app/login');
    }

    console.log("Authentication error:", error);

    return res.status(401).json({
      success: false,
      error: error.message || 'Invalid token',
    });
  }
};

module.exports = {
  authenticateAdmin,
};