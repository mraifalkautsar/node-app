const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const userController = require('../controllers/adminUserController');

// All routes require admin authentication
router.use(authenticateAdmin);

// GET /admin/users - List users with pagination
router.get('/', userController.getUsers);

// GET /admin/users/:id - Get user details
router.get('/:id', userController.getUserById);

module.exports = router;
