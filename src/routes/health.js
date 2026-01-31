const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

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
