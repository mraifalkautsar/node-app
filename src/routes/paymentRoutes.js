const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

//  Webhook - NO AUTH (verified by Midtrans signature)
router.post('/notification', 
    paymentController.handleNotification.bind(paymentController)
);

//  Public endpoint - Health check
router.get('/health', 
    paymentController.healthCheck.bind(paymentController)
);

//  Protected endpoints
router.post('/topup', 
    paymentController.createTopup.bind(paymentController)
);

router.get('/my-topups', 
    paymentController.getUserTopups.bind(paymentController)
);

router.get('/status/:orderId', 
    paymentController.getPaymentStatus.bind(paymentController)
);

module.exports = router;