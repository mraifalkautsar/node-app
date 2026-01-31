const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { 
  generateAccessToken, 
  verifyAccessToken
} = require('../utils/jwt');

/**
 * Admin login
 * POST /admin/auth/login
 */
const login = async (req, res) => {
  try {
    console.log("Login Request Body:", req.body);
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    // Find admin user
    const result = await db.query(
      'SELECT user_id, email, password, role, name FROM users WHERE email = $1 AND role = $2',
      [email, 'ADMIN']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    console.log("Password Validity:", isValidPassword)

    // Generate tokens
    const payload = {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      name: user.name,
      sub: user.user_id,
    };

    const accessToken = generateAccessToken(payload);

    res.json({
      success: true,
      data: {
        accessToken,
        user: {
          user_id: user.user_id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
    });
  }
};

// Note: refresh token flow removed; tokens expire and require re-login.

/**
 * Logout
 * POST /admin/auth/logout
 */
const logout = async (req, res) => {
  // With refresh tokens removed, logout is client-side: clear stored token.
  return res.json({ success: true, message: 'Logged out (client should clear token)' });
};

/**
 * Verify current access token
 * GET /admin/auth/me
 */
const me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const parts = authHeader.split(' ');
    const token = parts.length === 2 ? parts[1] : null;

    console.log("Verifying token in /me endpoint:", token);

    if (!token) {
      return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }

    // verifyAccessToken should throw on invalid/expired token or return decoded payload
    const payload = await verifyAccessToken(token);

    // Normalize response (do not return sensitive fields)
    const user = {
      user_id: payload.user_id || payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };

    return res.json({ success: true, data: { user } });
  } catch (err) {
    console.error('Token verification failed:', err && err.message ? err.message : err);
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};

module.exports = {
  login,
  logout,
  me,
};
