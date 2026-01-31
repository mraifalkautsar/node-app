const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

/**
 * @swagger
 * /api/payment/notification:
 *   post:
 *     summary: Webhook for payment notifications
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Notification handled successfully.
 */
router.post('/notification', 
    paymentController.handleNotification.bind(paymentController)
);

/**
 * @swagger
 * /api/payment/health:
 *   get:
 *     summary: Health check for the payment service
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: Payment service is healthy.
 */
router.get('/health', 
    paymentController.healthCheck.bind(paymentController)
);

/**
 * @swagger
 * /api/payment/topup:
 *   post:
 *     summary: Create a top-up transaction
 *     tags: [Payment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Top-up transaction created successfully.
 */
router.post('/topup', 
    paymentController.createTopup.bind(paymentController)
);

/**
 * @swagger
 * /api/payment/my-topups:
 *   get:
 *     summary: Get top-up history for the current user
 *     tags: [Payment]
 *     responses:
 *       200:
 *         description: A list of top-up transactions.
 */
router.get('/my-topups', 
    paymentController.getUserTopups.bind(paymentController)
);

/**
 * @swagger
 * /api/payment/status/{orderId}:
 *   get:
 *     summary: Get payment status for an order
 *     tags: [Payment]
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Payment status for the order.
 */
router.get('/status/:orderId', 
    paymentController.getPaymentStatus.bind(paymentController)
);

module.exports = router;