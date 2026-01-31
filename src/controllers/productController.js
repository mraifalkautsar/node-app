const { query } = require('../config/database');

async function listByStore(req, res, next) {
	try {
		const storeId = Number(req.query.store_id);
		const q = String(req.query.q || '').trim();
		const limit = Math.min(Number(req.query.limit || 200), 200);

		if (!storeId) {
			return res.status(400).json({
				success: false,
				error: 'store_id is required',
			});
		}

		const params = [storeId, limit];
		let where = `p.store_id = $1 AND p.deleted_at IS NULL`;
		if (q) {
			params.splice(1, 0, `%${q}%`); // jadi [storeId, like, limit]
			where += ` AND p.product_name ILIKE $2`;
		}

		const sql = q
			? `
			SELECT
				p.product_id,
				p.store_id,
				p.product_name,
				p.price,
				p.main_image_path
			FROM products p
			WHERE ${where}
			ORDER BY p.updated_at DESC
			LIMIT $3
			`
			: `
			SELECT
				p.product_id,
				p.store_id,
				p.product_name,
				p.price,
				p.main_image_path
			FROM products p
			WHERE ${where}
			ORDER BY p.updated_at DESC
			LIMIT $2
			`;

		const result = await query(sql, params);

		const products = result.rows.map((r) => ({
			id: r.product_id,
			store_id: r.store_id,
			name: r.product_name,
			price: Number(r.price || 0),
			priceFormatted: formatRupiah(r.price),
			imageUrl: r.main_image_path ? toPublicProductImageUrl(r.main_image_path) : null,
			productUrl: `/product/${r.product_id}`,
		}));

		return res.json({
			success: true,
			data: products,
		});
	} catch (err) {
		next(err);
	}
}

function formatRupiah(n) {
	const val = Number(n || 0);
	return 'Rp' + val.toLocaleString('id-ID');
}

function toPublicProductImageUrl(imagePath) {
	if (!imagePath) return null;
	if (String(imagePath).startsWith('http')) return imagePath;
	const cleanPath = String(imagePath).replace(/^\/uploads\//, '');
	return `/uploads/${cleanPath}`;
}

module.exports = {
	listByStore,
};