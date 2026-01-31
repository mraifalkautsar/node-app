const express = require('express');
const router = express.Router();
const pushController = require('../controllers/pushController');
const expressSessionAuth = require('../middleware/expressSessionAuth');

// Publicly expose the VAPID key - no auth needed
router.get('/vapidPublicKey', pushController.getVapidPublicKey);

// POST /api/node/push/subscribe - This route requires authentication
router.post('/subscribe', expressSessionAuth, pushController.saveSubscription);

module.exports = router;
