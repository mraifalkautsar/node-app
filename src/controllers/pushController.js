const db = require("../config/database");

/**
 * Save a push notification subscription to the database.
 * POST /api/node/push/subscribe
 */
const saveSubscription = async (req, res) => {
  try {
    const userId = req.userId; // From sessionAuth middleware
    const sub = req.body;

    if (!userId) {
      return res
        .status(401)
        .json({ success: false, error: "Authentication required." });
    }

    if (
      !sub ||
      !sub.endpoint ||
      !sub.keys ||
      !sub.keys.p256dh ||
      !sub.keys.auth
    ) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid subscription object." });
    }

    const {
      endpoint,
      keys: { p256dh, auth },
    } = sub;

    // Use INSERT ON CONFLICT to either create a new subscription or update an existing one for the same endpoint
    const query = `
            INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (endpoint)
            DO UPDATE SET
                user_id = EXCLUDED.user_id,
                p256dh_key = EXCLUDED.p256dh_key,
                auth_key = EXCLUDED.auth_key,
                updated_at = NOW()
        `;

    await db.query(query, [userId, endpoint, p256dh, auth]);

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("Save Push Subscription Error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to save push subscription.",
    });
  }
};

const getVapidPublicKey = (req, res) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
        console.error("VAPID_PUBLIC_KEY not configured on the server.");
        return res.status(500).json({ error: 'Push notifications are not configured.' });
    }
    // Send as plain text, as the client will use response.text()
    res.type('text/plain').send(process.env.VAPID_PUBLIC_KEY);
};

module.exports = {
    saveSubscription,
    getVapidPublicKey,
};
