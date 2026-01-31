const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     description: Responds if the app is up and running
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: App is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 database:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                     timestamp:
 *                       type: string
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    
    res.json({
      success: true,
      message: 'API is healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        timestamp: result.rows[0].now,
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      database: {
        connected: false,
      },
    });
  }
});

module.exports = router;
