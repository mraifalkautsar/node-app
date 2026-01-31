const express = require('express');
const router = express.Router();
const { getUserFromRequest } = require('../utils/phpSession');

/**
 * @swagger
 * /session/check:
 *   get:
 *     summary: Check the current session
 *     tags: [Session]
 *     responses:
 *       200:
 *         description: Session is valid.
 *       400:
 *         description: No cookies sent.
 *       404:
 *         description: Session not found or invalid.
 *       500:
 *         description: Internal server error.
 */
router.get('/check', async (req, res) => {
    try {
            const cookies = req.headers.cookie;
            if (!cookies) {
                return res.status(400).json({ success: false, error: 'No cookies sent' });
            }

            const info = await getUserFromRequest(req);
            if (!info) {
                return res.status(404).json({ success: false, error: 'Session not found or invalid' });
            }

            return res.json({ success: true, sessionKey: `PHPSESSID:${info.sessionId}`, raw: info.raw, parsed: { user: info.user } });
    } catch (err) {
        console.error('Session check error:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
