const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const flagsController = require('../controllers/adminFlagsController');

// All routes require admin authentication
router.use(authenticateAdmin);

/**
 * @swagger
 * /admin/flags:
 *   get:
 *     summary: Get all global feature flags
 *     tags: [Admin - Feature Flags]
 *     responses:
 *       200:
 *         description: A list of global feature flags.
 */
router.get('/', flagsController.getGlobalFlags);

/**
 * @swagger
 * /admin/flags/enable:
 *   post:
 *     summary: Enable a global feature flag
 *     tags: [Admin - Feature Flags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flagName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Flag enabled successfully.
 */
router.post('/enable', flagsController.enableGlobalFlag);

/**
 * @swagger
 * /admin/flags/disable:
 *   post:
 *     summary: Disable a global feature flag
 *     tags: [Admin - Feature Flags]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flagName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Flag disabled successfully.
 */
router.post('/disable', flagsController.disableGlobalFlag);

/**
 * @swagger
 * /admin/flags/users/{id}:
 *   get:
 *     summary: Get feature flags for a specific user
 *     tags: [Admin - Feature Flags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of feature flags for the user.
 */
router.get('/users/:id', flagsController.getUserFlags);

/**
 * @swagger
 * /admin/flags/users/{id}/enable:
 *   post:
 *     summary: Enable a feature flag for a specific user
 *     tags: [Admin - Feature Flags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flagName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Flag enabled successfully for the user.
 */
router.post('/users/:id/enable', flagsController.enableUserFlag);

/**
 * @swagger
 * /admin/flags/users/{id}/disable:
 *   post:
 *     summary: Disable a feature flag for a specific user
 *     tags: [Admin - Feature Flags]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               flagName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Flag disabled successfully for the user.
 */
router.post('/users/:id/disable', flagsController.disableUserFlag);

module.exports = router;
