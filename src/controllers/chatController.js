const chatService = require('../services/chatService');

/**
 * Baca user dari header:
 *   x-user-id, x-user-role
 * dipakai semua endpoint chat API.
 */
function authFromHeaders(req) {
	const userIdHeader = req.headers['x-user-id'];
	const roleHeader = req.headers['x-user-role'];

	const userId = userIdHeader ? parseInt(userIdHeader, 10) : null;
	const role = roleHeader ? String(roleHeader).toUpperCase() : null;

	return { userId, role };
}

/**
 * Helper seragam: mengembalikan { id, role } atau null.
 */
function getUserFromRequest(req) {
	const { userId, role } = authFromHeaders(req);
	if (!userId || !role) return null;
	return { id: userId, role };
}

/**
 * GET /node/api/chat/stores
 * (dipakai buyer untuk dropdown "+ Chat Room")
 */
async function listStoresForChat(req, res, next) {
	const user = getUserFromRequest(req);
	if (!user || user.role !== 'BUYER') {
		return res.status(401).json({
			success: false,
			error: 'Unauthorized',
		});
	}

	try {
		const stores = await chatService.getStoresForChat();
		return res.json({
			success: true,
			data: stores,
		});
	} catch (err) {
		next(err);
	}
}

/**
 * GET /node/api/chat/rooms?role=BUYER|SELLER (optional)
 */
async function getRooms(req, res, next) {
	try {
		const { userId, role } = authFromHeaders(req);

		if (!userId || !role) {
			return res.status(401).json({
				success: false,
				error: 'Unauthorized',
			});
		}

		const roleFilter = (req.query.role || role || '').toUpperCase();

		const rooms = await chatService.getRoomsForUser({
			userId,
			role: roleFilter,
		});

		res.json({
			success: true,
			data: rooms,
		});
	} catch (err) {
		next(err);
	}
}

/**
 * GET /node/api/chat/messages?store_id=..&buyer_id=..&limit=..&before=..
 */
async function getMessages(req, res, next) {
	try {
		const user = getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({
				success: false,
				error: 'Unauthorized',
			});
		}

		const storeId = Number(req.query.store_id);
		const buyerId = Number(req.query.buyer_id);
		const limit = Number(req.query.limit || 50);

		if (!storeId || !buyerId) {
			return res.status(400).json({
				success: false,
				error: 'store_id and buyer_id are required',
			});
		}

		const canJoin = await chatService.canUserJoinRoom(
			user.id,
			user.role,
			storeId,
			buyerId
		);

		if (!canJoin) {
			return res.status(403).json({
				success: false,
				error: 'Not allowed to view this room',
			});
		}

		const messages = await chatService.getRecentMessages(
			storeId,
			buyerId,
			limit
		);

		res.json({
			success: true,
			data: messages,
		});
	} catch (err) {
		next(err);
	}
}

/**
 * POST /node/api/chat/messages
 * body: { store_id, buyer_id, message_type, content, product_id? }
 */
async function sendMessage(req, res) {
	return res.status(410).json({
		success: false,
		error: 'Message sending is handled via Socket.IO only',
	});
}

/**
 * POST /node/api/chat/messages/read
 * body: { store_id, buyer_id }
 */
async function markAsRead(req, res, next) {
	try {
		const user = getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({
				success: false,
				error: 'Unauthorized',
			});
		}

		const { store_id, buyer_id } = req.body || {};
		if (!store_id || !buyer_id) {
			return res.status(400).json({
				success: false,
				error: 'store_id and buyer_id are required',
			});
		}

		const canJoin = await chatService.canUserJoinRoom(
			user.id,
			user.role,
			store_id,
			buyer_id
		);

		if (!canJoin) {
			return res.status(403).json({
				success: false,
				error: 'Not allowed to mark messages in this room',
			});
		}

		await chatService.markMessagesAsRead(store_id, buyer_id, user.id);

		res.json({
			success: true,
			data: {
				store_id,
				buyer_id,
			},
		});
	} catch (err) {
		next(err);
	}
}

/**
 * POST /node/api/chat/rooms/ensure
 * body: { store_id, buyer_id? }
 * - BUYER: buyer_id otomatis = user.id
 * - SELLER: buyer_id wajib dikirim di body
 */
async function ensureRoom(req, res, next) {
	try {
		const user = getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({
				success: false,
				error: 'Unauthorized',
			});
		}

		const { store_id, buyer_id } = req.body || {};

		if (!store_id) {
			return res.status(400).json({
				success: false,
				error: 'store_id is required',
			});
		}

		let finalBuyerId = buyer_id;

		if (user.role === 'BUYER') {
			finalBuyerId = user.id;
		}

		if (!finalBuyerId) {
			return res.status(400).json({
				success: false,
				error: 'buyer_id is required',
			});
		}

		const allowed = await chatService.canUserJoinRoom(
			user.id,
			user.role,
			store_id,
			finalBuyerId
		);

		if (!allowed) {
			return res.status(403).json({
				success: false,
				error: 'Forbidden',
			});
		}

		const room = await chatService.getOrCreateRoom(store_id, finalBuyerId);

		return res.json({
			success: true,
			data: {
				store_id: room.store_id,
				buyer_id: room.buyer_id,
			},
		});
	} catch (err) {
		next(err);
	}
}

const path = require('path');

async function uploadImage(req, res, next) {
	try {
		if (!req.file) {
			return res.status(400).json({ message: 'No file uploaded' });
		}

		// misal kamu serve folder /uploads secara statis
		// sehingga URL-nya bisa: /node/uploads/chat/<filename> (via nginx proxy)
		const fileUrl = `/uploads/chat/${req.file.filename}`;
		
		return res.json({
			success: true,
			url: fileUrl,
		});
	} catch (err) {
		console.error('uploadImage error:', err);
		return res.status(500).json({ message: 'Failed to upload image' });
	}
};

async function listInvoicesForChat(req, res, next) {
	try {
		const user = getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({
				success: false,
				error: 'Unauthorized',
			});
		}

		const storeId = Number(req.query.store_id);
		const buyerId = Number(req.query.buyer_id);

		if (!storeId || !buyerId) {
			return res.status(400).json({
				success: false,
				error: 'store_id and buyer_id are required',
			});
		}

		if (user.role === 'BUYER' && Number(user.id) !== Number(buyerId)) {
			return res.status(403).json({
				success: false,
				error: 'Forbidden',
			});
		}

		const canJoin = await chatService.canUserJoinRoom(
			user.id,
			user.role,
			storeId,
			buyerId
		);

		if (!canJoin) {
			return res.status(403).json({
				success: false,
				error: 'Forbidden',
			});
		}

		const invoices = await chatService.getInvoicesForRoom({
			storeId,
			buyerId,
		});

		return res.json({
			success: true,
			data: invoices,
		});
	} catch (err) {
		next(err);
	}
}

module.exports = {
	listStoresForChat,
	getRooms,
	getMessages,
	sendMessage,
	markAsRead,
	ensureRoom,
	uploadImage,
	listInvoicesForChat,
};