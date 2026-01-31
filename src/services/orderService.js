const { query } = require('../config/database');

async function getStoreIdBySellerUserId(userId) {
	const sql = `SELECT store_id FROM stores WHERE user_id = $1 LIMIT 1`;
	const r = await query(sql, [userId]);
	return r.rows?.[0]?.store_id || null;
}

async function getOrderDetailById(orderId) {

	const sql = `
		SELECT
			o.order_id,
			o.buyer_id,
			o.store_id,
			o.total_price,
			o.shipping_address,
			o.status,
			o.reject_reason,
			o.confirmed_at,
			o.delivery_time,
			o.received_at,
			o.created_at,
			s.store_name,
			u.name AS buyer_name,
			COALESCE(
				json_agg(
					json_build_object(
						'order_item_id', oi.order_item_id,
						'product_id', oi.product_id,
						'product_name', COALESCE(p.product_name, 'Produk tidak tersedia'),
						'quantity', oi.quantity,
						'price_at_order', oi.price_at_order,
						'subtotal', oi.subtotal,
						'image', p.main_image_path
					)
					ORDER BY oi.order_item_id ASC
				) FILTER (WHERE oi.order_item_id IS NOT NULL),
				'[]'::json
			) AS items
		FROM orders o
		LEFT JOIN stores s ON s.store_id = o.store_id
		LEFT JOIN users u ON u.user_id = o.buyer_id
		LEFT JOIN order_items oi ON oi.order_id = o.order_id
		LEFT JOIN products p ON p.product_id = oi.product_id
		WHERE o.order_id = $1
		GROUP BY o.order_id, s.store_name, u.name
		LIMIT 1;
	`;

	const r = await query(sql, [orderId]);
	const row = r.rows?.[0];
	if (!row) return null;

	return {
		order_id: row.order_id,
		receipt_number: `#${row.order_id}`,
		buyer_id: row.buyer_id,
		buyer_name: row.buyer_name,
		store_id: row.store_id,
		store_name: row.store_name,
		total_price: Number(row.total_price || 0),
		shipping_address: row.shipping_address,
		status: row.status,
		reject_reason: row.reject_reason,
		confirmed_at: row.confirmed_at,
		delivery_time: row.delivery_time,
		received_at: row.received_at,
		created_at: row.created_at,
		items: Array.isArray(row.items) ? row.items : [],
	};
}

module.exports = {
	getStoreIdBySellerUserId,
	getOrderDetailById,
};
