const webPush = require("web-push");
const db = require("../config/database");

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

// Configure web-push with VAPID details
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    "mailto:admin@nimonspedia.com", // This should be a valid email address
    vapidPublicKey,
    vapidPrivateKey,
  );
  console.log("Web Push VAPID keys configured.");
} else {
  console.warn(
    "VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY are not set in .env. Push notifications will be disabled.",
  );
}

/**
 * Sends a push notification to a specific user.
 * @param {number} userId The ID of the user to send the notification to.
 * @param {object} payload The notification payload.
 * @param {string} payload.title The title of the notification.
 * @param {string} payload.body The body/text of the notification.
 * @param {string} payload.url The URL to open when the notification is clicked.
 * @param {string} type The type of notification ('chat', 'auction', 'order').
 */
async function sendNotification(userId, payload, type) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    // Silently fail if VAPID keys are not set
    return;
  }

  try {
    // Check user preferences
    const preferences = await db.query(
      "SELECT chat_enabled, auction_enabled, order_enabled FROM push_preferences WHERE user_id = $1",
      [userId],
    );

    if (preferences.rows.length > 0) {
      const userPrefs = preferences.rows[0];
      if (
        (type === 'chat' && !userPrefs.chat_enabled) ||
        (type === 'auction' && !userPrefs.auction_enabled) ||
        (type === 'order' && !userPrefs.order_enabled)
      ) {
        console.log(`Notification of type '${type}' for user ${userId} is disabled by preferences.`);
        return; // Do not send if disabled
      }
    }

    const subscriptions = await db.query(
      "SELECT endpoint, p256dh_key, auth_key FROM push_subscriptions WHERE user_id = $1",
      [userId],
    );

    if (subscriptions.rows.length === 0) {
      // No subscriptions found for this user
      return;
    }

    const notificationPayload = JSON.stringify(payload);

    const sendPromises = subscriptions.rows.map((sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh_key,
          auth: sub.auth_key,
        },
      };

      return webPush
        .sendNotification(pushSubscription, notificationPayload)
        .catch(async (error) => {
          // If the subscription is expired or invalid, the push service will return a 410 Gone status code.
          if (error.statusCode === 410) {
            console.log(
              `Subscription for user ${userId} has expired. Deleting from DB.`,
            );
            await db.query(
              "DELETE FROM push_subscriptions WHERE endpoint = $1",
              [sub.endpoint],
            );
          } else {
            console.error(
              "Failed to send notification to one of the endpoints:",
              error.body,
            );
          }
        });
    });

    await Promise.all(sendPromises);
  } catch (dbError) {
    console.error("Database error while sending push notification:", dbError);
  }
}

module.exports = {
  sendNotification,
};
