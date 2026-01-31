const express = require('express');
const router = express.Router();
const internalController = require('../controllers/internalController');

let schedulerCallback = null;

router.post('/push/notify', internalController.sendPushNotification);

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
