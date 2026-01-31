const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/adminAuthController');

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.ADMIN_LOGIN_RATE_LIMIT) || 5,
  message: {
    success: false,
    error: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /admin/auth/login
router.post('/login', loginLimiter, authController.login);
// POST /admin/auth/logout
router.post('/logout', authController.logout);
// GET /admin/auth/me
router.get('/me', authController.me);

module.exports = router;
