const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const cacheController = require('../controllers/adminCacheController');

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * @swagger
 * /admin/cache/stats:
 *   get:
 *     summary: Get cache statistics
 *     description: Retrieve statistics about the Redis cache. Requires admin authentication.
 *     tags: [Admin - Cache]
 *     responses:
 *       200:
 *         description: Cache statistics retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *       500:
 *         description: Internal server error.
 */
router.get('/stats', cacheController.getCacheStats);

/**
 * @swagger
 * /admin/cache/keys:
 *   get:
 *     summary: Get cache keys
 *     description: Retrieve cache keys matching a specific pattern. Requires admin authentication.
 *     tags: [Admin - Cache]
 *     parameters:
 *       - in: query
 *         name: pattern
 *         schema:
 *           type: string
 *         required: true
 *         description: The pattern to match keys against (e.g., 'user:*').
 *     responses:
 *       200:
 *         description: Cache keys retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 keys:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Internal server error.
 */
router.get('/keys', cacheController.getCacheKeys);

/**
 * @swagger
 * /admin/cache/clear:
 *   post:
 *     summary: Clear cache
 *     description: Clear the entire Redis cache. This is a destructive operation. Requires admin authentication.
 *     tags: [Admin - Cache]
 *     responses:
 *       200:
 *         description: Cache cleared successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error.
 */
router.post('/clear', cacheController.clearCache);

module.exports = router;
