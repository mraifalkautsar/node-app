const db = require('../config/database');

/**
 * Get users with keyset pagination
 * GET /admin/users
 * Query params: limit, cursor (user_id), search
 */
const getUsers = async (req, res) => {
  try {
    const { limit = 20, cursor, search } = req.query;
    const limitNum = Math.min(parseInt(limit) || 20, 100); // Max 100
    const limitPlusOne = limitNum + 1;

    let query;
    let params;

    if (search) {
      // Trigram-based fuzzy search with similarity ranking and prefix boosting
      if (cursor) {
        query = `
          SELECT user_id, email, role, name, address, balance, created_at, updated_at,
                 GREATEST(
                   similarity(name, $1),
                   similarity(email, $1)
                 ) as search_rank,
                 CASE
                   WHEN email ILIKE $4 THEN 2
                   WHEN name ILIKE $4 THEN 1
                   ELSE 0
                 END AS prefix_boost
          FROM users
          WHERE (name % $1 OR email % $1 OR name ILIKE $4 OR email ILIKE $4)
            AND user_id > $2
          ORDER BY prefix_boost DESC, search_rank DESC, user_id ASC
          LIMIT $3
        `;
        params = [search, parseInt(cursor), limitPlusOne, `${search}%`];
      } else {
        query = `
          SELECT user_id, email, role, name, address, balance, created_at, updated_at,
                 GREATEST(
                   similarity(name, $1),
                   similarity(email, $1)
                 ) as search_rank,
                 CASE
                   WHEN email ILIKE $3 THEN 2
                   WHEN name ILIKE $3 THEN 1
                   ELSE 0
                 END AS prefix_boost
          FROM users
          WHERE name % $1 OR email % $1 OR name ILIKE $3 OR email ILIKE $3
          ORDER BY prefix_boost DESC, search_rank DESC, user_id ASC
          LIMIT $2
        `;
        params = [search, limitPlusOne, `${search}%`];
      }
    } else {
      // Regular pagination
      if (cursor) {
        query = `
          SELECT user_id, email, role, name, address, balance, created_at, updated_at
          FROM users
          WHERE user_id > $1
          ORDER BY user_id ASC
          LIMIT $2
        `;
        params = [parseInt(cursor), limitPlusOne];
      } else {
        query = `
          SELECT user_id, email, role, name, address, balance, created_at, updated_at
          FROM users
          ORDER BY user_id ASC
          LIMIT $1
        `;
        params = [limitPlusOne];
      }
    }

    const result = await db.query(query, params);
    let users = result.rows;

    let hasMore = false;
    let nextCursor = null;
    if (users.length > limitNum) {
      hasMore = true;
      nextCursor = users[limitNum - 1].user_id;
      users = users.slice(0, limitNum);
    } else {
      hasMore = false;
      nextCursor = null;
    }

    // Remove search_rank from response if present
    users.forEach(user => delete user.search_rank);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          nextCursor,
          hasMore,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
};

/**
 * Get user by ID
 * GET /admin/users/:id
 */
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT u.user_id, u.email, u.role, u.name, u.address, u.balance, 
              u.created_at, u.updated_at,
              s.store_id, s.store_name, s.store_description
       FROM users u
       LEFT JOIN stores s ON u.user_id = s.user_id
       WHERE u.user_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const user = result.rows[0];

    // Get user's feature flags
    const flagsResult = await db.query(
      `SELECT flag_name, is_enabled, disabled_reason, updated_at
       FROM user_feature_access
       WHERE user_id = $1`,
      [id]
    );

    res.json({
      success: true,
      data: {
        user,
        featureFlags: flagsResult.rows,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
};
