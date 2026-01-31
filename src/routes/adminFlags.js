const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const flagsController = require('../controllers/adminFlagsController');

// All routes require admin authentication
router.use(authenticateAdmin);

// Global feature flags
router.get('/', flagsController.getGlobalFlags);
router.post('/enable', flagsController.enableGlobalFlag);
router.post('/disable', flagsController.disableGlobalFlag);

// User-specific feature flags
router.get('/users/:id', flagsController.getUserFlags);
router.post('/users/:id/disable', flagsController.disableUserFlag);
router.post('/users/:id/enable', flagsController.enableUserFlag);

module.exports = router;
