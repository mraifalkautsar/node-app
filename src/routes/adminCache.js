const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const cacheController = require('../controllers/adminCacheController');

// All routes require admin authentication
router.use(authenticateAdmin);

// GET /admin/cache/stats - Get cache statistics
router.get('/stats', cacheController.getCacheStats);

// GET /admin/cache/keys - Get cache keys with pattern
router.get('/keys', cacheController.getCacheKeys);

// POST /admin/cache/clear - Clear cache
router.post('/clear', cacheController.clearCache);

module.exports = router;
