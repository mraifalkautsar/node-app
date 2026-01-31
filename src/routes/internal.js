const express = require('express');
const router = express.Router();
const internalController = require('../controllers/internalController');

let schedulerCallback = null;

/**
 * @swagger
 * /internal/push/notify:
 *   post:
 *     summary: Send a push notification
 *     tags: [Internal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               target:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification sent successfully.
 */
router.post('/push/notify', internalController.sendPushNotification);

/**
 * @swagger
 * /internal/trigger-scheduler:
 *   post:
 *     summary: Trigger the scheduler
 *     tags: [Internal]
 *     responses:
 *       200:
 *         description: Scheduler triggered successfully.
 *       503:
 *         description: Scheduler not initialized.
 */
router.post('/trigger-scheduler', (req, res) => {
    if (!schedulerCallback) {
        return res.status(503).json({
            status: 'error',
            message: 'Scheduler not initialized'
        });
    }

    schedulerCallback();

    res.json({
        status: 'success',
        message: 'Scheduler triggered'
    });
});

const setSchedulerCallback = (callback) => {
    schedulerCallback = callback;
};

module.exports = { router, setSchedulerCallback };
