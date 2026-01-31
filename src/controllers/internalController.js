const { sendNotification } = require('../services/pushService');

/**
 * Controller for handling internal API requests, e.g., from the PHP backend.
 */
const internalController = {
  /**
   * POST /internal/push/notify
   * Triggers a push notification to a specific user.
   *
   * @body {
   *   userId: number,
   *   payload: {
   *     title: string,
   *     body: string,
   *     url: string
   *   }
   * }
   */
  async sendPushNotification(req, res) {
    try {
      const { userId, payload } = req.body;

      if (!userId || !payload || !payload.title || !payload.body || !payload.url) {
        return res.status(400).json({ success: false, error: 'Invalid request body. Required: userId, payload.{title, body, url}' });
      }

      // Asynchronously send the notification and respond immediately.
      // No need to wait for the push to be sent.
      sendNotification(parseInt(userId, 10), payload).catch(err => {
        console.error(`Internal push notification failed for user ${userId}:`, err);
      });

      res.status(202).json({ success: true, message: 'Push notification queued for sending.' });

    } catch (error) {
      console.error('Internal sendPushNotification controller error:', error);
      res.status(500).json({ success: false, error: 'Internal server error.' });
    }
  }
};

module.exports = internalController;
