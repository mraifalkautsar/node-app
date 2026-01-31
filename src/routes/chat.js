const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const orderController = require('../controllers/orderController');
const multer = require('multer');
const path = require('path');
const uploadDir = path.join(__dirname, '../../uploads/chat');
const fs = require('fs');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({ dest: uploadDir });

/**
 * @swagger
 * /api/chat/rooms:
 *   get:
 *     summary: Get chat rooms
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: A list of chat rooms.
 */
router.get('/rooms', chatController.getRooms);

/**
 * @swagger
 * /api/chat/messages:
 *   get:
 *     summary: Get messages for a room
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: roomId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of messages for the room.
 */
router.get('/messages', chatController.getMessages);

/**
 * @swagger
 * /api/chat/stores:
 *   get:
 *     summary: List stores for chat
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: A list of stores.
 */
router.get('/stores', chatController.listStoresForChat);

/**
 * @swagger
 * /api/chat/invoices:
 *   get:
 *     summary: List invoices for chat
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: A list of invoices.
 */
router.get('/invoices', chatController.listInvoicesForChat);

/**
 * @swagger
 * /api/chat/orders/{order_id}:
 *   get:
 *     summary: Get order details
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details.
 */
router.get('/orders/:order_id', orderController.getOrderDetail);

/**
 * @swagger
 * /api/chat/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roomId:
 *                 type: integer
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message sent successfully.
 */
router.post('/messages', chatController.sendMessage);

/**
 * @swagger
 * /api/chat/messages/read:
 *   post:
 *     summary: Mark messages as read
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               roomId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Messages marked as read.
 */
router.post('/messages/read', chatController.markAsRead);

/**
 * @swagger
 * /api/chat/rooms/ensure:
 *   post:
 *     summary: Ensure a chat room exists
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Chat room ensured.
 */
router.post('/rooms/ensure', chatController.ensureRoom);

/**
 * @swagger
 * /api/chat/upload-image:
 *   post:
 *     summary: Upload an image
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Image uploaded successfully.
 */
router.post('/upload-image', upload.single('image'), chatController.uploadImage);

module.exports = router;