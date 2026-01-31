const { getSessionById, parsePHPSession } = require('../utils/phpSession');

/**
 * Express middleware for Redis-based PHP session authentication
 * Reads PHP sessions from Redis and extracts user_id and role
 */
async function expressSessionAuth(req, res, next) {
    try {
        const cookies = req.headers.cookie;

        if (!cookies) {
            return res.status(401).json({ success: false, error: 'No session cookie provided' });
        }

        const sessionMatch = cookies.match(/PHPSESSID=([^;]+)/);

        if (!sessionMatch) {
            return res.status(401).json({ success: false, error: 'Invalid session cookie' });
        }

        const sessionId = sessionMatch[1];
        const sessionData = await getSessionById(sessionId);

        if (!sessionData) {
            return res.status(401).json({ success: false, error: 'Session not found or expired' });
        }

        const parsed = parsePHPSession(sessionData);
        if (!parsed || !parsed.user || !parsed.user.user_id || !parsed.user.role) {
            return res.status(401).json({ success: false, error: 'User not logged in' });
        }

        // Attach user data to the request object
        req.userId = parsed.user.user_id;
        req.role = parsed.user.role;
        req.sessionId = sessionId;

        next();
    } catch (error) {
        console.error('Session authentication error:', error);
        res.status(500).json({ success: false, error: 'Authentication failed' });
    }
}

module.exports = expressSessionAuth;
