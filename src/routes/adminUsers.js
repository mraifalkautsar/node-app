const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const userController = require('../controllers/adminUserController');

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List users with pagination
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: The page number to retrieve.
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *         description: The number of users to retrieve per page.
 *     responses:
 *       200:
 *         description: A list of users.
 */
router.get('/', userController.getUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     summary: Get user details by ID
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user to retrieve.
 *     responses:
 *       200:
 *         description: User details.
 *       404:
 *         description: User not found.
 */
router.get('/:id', userController.getUserById);

module.exports = router;
