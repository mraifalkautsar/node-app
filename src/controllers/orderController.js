const orderService = require('../services/orderService');

/**
 * Helper to extract user from headers (x-user-id, x-user-role)
 */
function getUserFromRequest(req) {
	const userIdHeader = req.headers['x-user-id'];
	const roleHeader = req.headers['x-user-role'];

	const userId = userIdHeader ? parseInt(userIdHeader, 10) : null;
	const role = roleHeader ? String(roleHeader).toUpperCase() : null;

	if (!userId || !role) return null;
	return { user_id: userId, id: userId, role };
}

async function getOrderDetail(req, res, next) {
	try {
		const user = getUserFromRequest(req);
		if (!user) {
			return res.status(401).json({ success: false, error: 'Unauthorized' });
		}

		const orderId = Number(req.params.order_id);
		if (!orderId) {
			return res.status(400).json({ success: false, error: 'Invalid order_id' });
		}

		const detail = await orderService.getOrderDetailById(orderId);
		if (!detail) {
			return res.status(404).json({ success: false, error: 'Order not found' });
		}

		const role = String(user.role || '').toUpperCase();

		if (role === 'BUYER') {
			const myId = Number(user.user_id ?? user.id);
			if (Number(detail.buyer_id) !== myId) {
				return res.status(403).json({ success: false, error: 'Forbidden' });
			}
		}

		if (role === 'SELLER') {
			const myId = Number(user.user_id ?? user.id);
			const myStoreId = await orderService.getStoreIdBySellerUserId(myId);
			if (!myStoreId || Number(detail.store_id) !== Number(myStoreId)) {
				return res.status(403).json({ success: false, error: 'Forbidden' });
			}
		}

		return res.json({ success: true, data: detail });
	} catch (err) {
		next(err);
	}
}

module.exports = {
	getOrderDetail,
};