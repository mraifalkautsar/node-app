const { query, transaction } = require('../config/database');

class ChatService {
	/**
	 * Cek apakah user boleh join / mengakses room tertentu
	 * @param {number} userId
	 * @param {string} role - 'BUYER' atau 'SELLER'
	 * @param {number} storeId
	 * @param {number} buyerId
	 * @returns {Promise<boolean>}
	 */
	async canUserJoinRoom(userId, role, storeId, buyerId) {
		const normRole = (role || '').toUpperCase();

		if (!userId || !normRole) return false;

		if (normRole === 'BUYER') {
			return userId === buyerId;
		}

		if (normRole === 'SELLER') {
			const storeResult = await query(
				`SELECT user_id
				FROM stores
				WHERE store_id = $1`,
				[storeId]
			);

			if (storeResult.rowCount === 0) return false;

			// pemilik toko = stores.user_id
			return storeResult.rows[0].user_id === userId;
		}

		return false;
	}

	// Ambil daftar room untuk user tertentu (BUYER / SELLER)
	async getRoomsForUser({ userId, role }) {
		if (!userId) {
			throw new Error('Missing user id');
		}

		const normRole = (role || '').toUpperCase();
		
		if (normRole === 'BUYER') {
			const result = await query(
				`
				SELECT
				cr.store_id,
				cr.buyer_id,
				cr.last_message_at,
				s.store_name,
				s.store_logo_path,
				lm.content AS last_message,
				COALESCE(
					SUM(
					CASE
						WHEN m.is_read = false AND m.sender_id != $1 THEN 1
						ELSE 0
					END
					),
				0) AS unread_count
				FROM chat_rooms cr
				JOIN stores s ON s.store_id = cr.store_id
				LEFT JOIN LATERAL (
				SELECT content, created_at
				FROM chat_messages
				WHERE store_id = cr.store_id
					AND buyer_id = cr.buyer_id
				ORDER BY created_at DESC
				LIMIT 1
				) lm ON TRUE
				LEFT JOIN chat_messages m
				ON m.store_id = cr.store_id
				AND m.buyer_id = cr.buyer_id
				WHERE cr.buyer_id = $1
				GROUP BY
				cr.store_id,
				cr.buyer_id,
				cr.last_message_at,
				s.store_name,
				s.store_logo_path,
				lm.content
				ORDER BY cr.last_message_at DESC NULLS LAST
				`,
				[userId]
			);

			return result.rows.map((row) => ({
				id: `${row.store_id}-${row.buyer_id}`,
				store_id: row.store_id,
				buyer_id: row.buyer_id,
				name: row.store_name,
				avatar: row.store_logo_path || null,
				lastMessage: row.last_message || '',
				lastMessageAt: row.last_message_at,
				unreadCount: Number(row.unread_count) || 0,
				roleLabel: 'penjual',
			}));
		}
		if (normRole === 'SELLER') {
			const result = await query(
				`
				SELECT
				cr.store_id,
				cr.buyer_id,
				cr.last_message_at,

				u.name AS buyer_name,
				u.email AS buyer_email,

				lm.content AS last_message,

				COALESCE(
					SUM(
					CASE
						WHEN m.is_read = false AND m.sender_id != $1 THEN 1
						ELSE 0
					END
					), 0
				) AS unread_count

				FROM chat_rooms cr
				JOIN stores s ON s.store_id = cr.store_id
				JOIN users u ON u.user_id = cr.buyer_id

				LEFT JOIN LATERAL (
				SELECT content, created_at
				FROM chat_messages
				WHERE store_id = cr.store_id
					AND buyer_id = cr.buyer_id
				ORDER BY created_at DESC
				LIMIT 1
				) lm ON TRUE

				LEFT JOIN chat_messages m
				ON m.store_id = cr.store_id
				AND m.buyer_id = cr.buyer_id

				WHERE s.user_id = $1

				GROUP BY
				cr.store_id,
				cr.buyer_id,
				cr.last_message_at,
				u.name,
				u.email,
				lm.content

				ORDER BY cr.last_message_at DESC NULLS LAST
				`,
				[userId]
			);

			return result.rows.map((row) => ({
				id: `${row.store_id}-${row.buyer_id}`,
				store_id: row.store_id,
				buyer_id: row.buyer_id,

				name: row.buyer_name,
				avatar: null,

				lastMessage: row.last_message || '',
				lastMessageAt: row.last_message_at,
				unreadCount: Number(row.unread_count) || 0,

				roleLabel: 'pembeli',
			}));
		}

		// role lain / tidak dikenali
		return [];
	}

	// Ambil satu room by (store_id, buyer_id)
	async getRoom(storeId, buyerId) {
		const result = await query(
			`SELECT *
       FROM chat_rooms
       WHERE store_id = $1 AND buyer_id = $2`,
			[storeId, buyerId]
		);

		return result.rows[0] || null;
	}

	// Ambil atau buat room baru kalau belum ada.
	async getOrCreateRoom(storeId, buyerId) {
		return await transaction(async (client) => {
			const existing = await client.query(
				`SELECT *
				FROM chat_rooms
				WHERE store_id = $1 AND buyer_id = $2`,
				[storeId, buyerId]
			);

			if (existing.rows.length > 0) {
				return existing.rows[0];
			}

			const created = await client.query(
				`INSERT INTO chat_rooms (store_id, buyer_id, last_message_at)
				VALUES ($1, $2, NOW())
				RETURNING *`,
				[storeId, buyerId]
			);

			return created.rows[0];
		});
	}

	// Ambil pesan terbaru di satu room.
	async getRecentMessages(storeId, buyerId, limit = 50) {
		const result = await query(
			`SELECT *
			FROM chat_messages
			WHERE store_id = $1 AND buyer_id = $2
			ORDER BY created_at DESC
			LIMIT $3`,
			[storeId, buyerId, limit]
		);

		// dibalik supaya urut waktu naik
		return result.rows.reverse();
	}

	// Ambil pesan yang lebih lama dari pesan tertentu (infinite scroll).
	// Dipakai saat user scroll ke atas.
	async getOlderMessages(storeId, buyerId, beforeMessageId, limit = 50) {
		const result = await query(
			`SELECT *
			FROM chat_messages
			WHERE store_id = $1
				AND buyer_id = $2
				AND message_id < $3
			ORDER BY created_at DESC
			LIMIT $4`,
			[storeId, buyerId, beforeMessageId, limit]
		);

		// dibalik supaya tetap urut waktu naik di UI
		return result.rows.reverse();
	}

	// Buat satu pesan baru di room.
	async createMessage({
		store_id,
		buyer_id,
		sender_id,
		message_type,
		content,
		product_id = null,
	}) {
		return await transaction(async (client) => {
			const msgResult = await client.query(
				`INSERT INTO chat_messages
					(store_id, buyer_id, sender_id, message_type, content, product_id, is_read, created_at)
					VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
					RETURNING *`,
				[store_id, buyer_id, sender_id, message_type, content, product_id]
			);

			const message = msgResult.rows[0];

			await client.query(
				`UPDATE chat_rooms
					SET last_message_at = NOW(), updated_at = NOW()
					WHERE store_id = $1 AND buyer_id = $2`,
				[store_id, buyer_id]
			);

			return message;
		});
	}

	// Tandai pesan di room tertentu sebagai sudah dibaca oleh user.
	async markMessagesAsRead(storeId, buyerId, readerId) {
		await query(
			`UPDATE chat_messages
			SET is_read = true
			WHERE store_id = $1
				AND buyer_id = $2
				AND sender_id != $3
				AND is_read = false`,
			[storeId, buyerId, readerId]
		);
	}

	// Ambil daftar toko untuk dropdown "+ Chat Room" (buyer side)
	async getStoresForChat() {
		const result = await query(
			`SELECT store_id, store_name
			FROM stores
			ORDER BY store_name ASC`
		);
		return result.rows;
	}

	async getInvoicesForRoom({ storeId, buyerId }) {
		const sql = `
			SELECT
				o.order_id,
				o.store_id,
				o.buyer_id,
				o.total_price,
				o.status,
				o.created_at,
				COALESCE(
					json_agg(
						json_build_object(
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
			LEFT JOIN order_items oi ON oi.order_id = o.order_id
			LEFT JOIN products p ON p.product_id = oi.product_id
			WHERE o.store_id = $1
				AND o.buyer_id = $2
			GROUP BY o.order_id
			ORDER BY o.created_at DESC;
		`;

		const rows = await query(sql, [storeId, buyerId]);

		// format minimal sesuai kebutuhan UI
		return (rows.rows || []).map((r) => ({
			order_id: r.order_id,
			receipt_number: `#${r.order_id}`,
			store_id: r.store_id,
			buyer_id: r.buyer_id,
			total_price: Number(r.total_price || 0),
			status: r.status,
			created_at: r.created_at,
			items: Array.isArray(r.items) ? r.items : [],
			title: `Order #${r.order_id}`,
			thumb_url: r.items?.[0]?.image || null,
		}));
	}

	// Get store name for typing indicator
	async getStoreName(storeId) {
		const result = await query(
			`SELECT store_name FROM stores WHERE store_id = $1`,
			[storeId]
		);
		return result.rows[0]?.store_name || null;
	}

}

module.exports = new ChatService();