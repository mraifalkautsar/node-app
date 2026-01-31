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

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     summary: Admin login
 *     description: Authenticate an admin user and get a token.
 *     tags: [Admin - Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginLimiter, authController.login);

/**
 * @swagger
 * /admin/auth/logout:
 *   post:
 *     summary: Admin logout
 *     description: Logout the current admin user.
 *     tags: [Admin - Auth]
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/logout', authController.logout);

/**
 * @swagger
 * /admin/auth/me:
 *   get:
 *     summary: Get current admin user
 *     description: Get the details of the currently logged-in admin user.
 *     tags: [Admin - Auth]
 *     responses:
 *       200:
 *         description: Successful response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authController.me);

module.exports = router;
