const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: List products by store
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: store_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of products for the store.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/', productController.listByStore);

module.exports = router;