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

router.get('/rooms', chatController.getRooms);
router.get('/messages', chatController.getMessages);
router.get('/stores', chatController.listStoresForChat);
router.get('/invoices', chatController.listInvoicesForChat);
router.get('/orders/:order_id', orderController.getOrderDetail);

router.post('/messages', chatController.sendMessage);
router.post('/messages/read', chatController.markAsRead);
router.post('/rooms/ensure', chatController.ensureRoom);
router.post('/upload-image', upload.single('image'), chatController.uploadImage);

module.exports = router;