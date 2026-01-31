const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const expressSessionAuth = require('../middleware/expressSessionAuth');

/**
 * @swagger
 * /api/push/vapidPublicKey:
 *   get:
 *     summary: Get the VAPID public key
 *     tags: [Push]
 *     responses:
 *       200:
 *         description: The VAPID public key.
 */
router.get('/vapidPublicKey', pushController.getVapidPublicKey);

/**
 * @swagger
 * /api/push/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     tags: [Push]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subscription:
 *                 type: object
 *     responses:
 *       200:
 *         description: Subscription saved successfully.
 */
router.post('/subscribe', expressSessionAuth, pushController.saveSubscription);

module.exports = router;
