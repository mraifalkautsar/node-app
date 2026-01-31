const { redisRaw } = require('../../config/redis');
const { getSessionById, parsePHPSession } = require('../../utils/phpSession');

/**
 * Socket.IO middleware for Redis-based PHP session authentication
 * Reads PHP sessions from Redis and extracts user_id and role
 * PHP stores sessions in Redis with key format: PHPSESSID:{sessionId}
 */
async function sessionAuth(socket, next) {
    try {
        // Extract cookies from handshake
        const cookies = socket.handshake.headers.cookie;

        if (!cookies) {
            return next(new Error('No session cookie provided'));
        }

        // Parse PHP session cookie (format: PHPSESSID=xxx)
        const sessionMatch = cookies.match(/PHPSESSID=([^;]+)/);

        if (!sessionMatch) {
            return next(new Error('Invalid session cookie'));
        }

        const sessionId = sessionMatch[1];

        // Read from Redis (PHP uses custom prefix PHPSESSID:)
        const sessionKey = `PHPSESSID:${sessionId}`;
        let sessionData;
        try {
            sessionData = await getSessionById(sessionId);
        } catch (error) {
            console.error('Redis session read error:', error);
            return next(new Error('Session read failed'));
        }

        if (!sessionData) {
            return next(new Error('Session not found or expired'));
        }

        // Parse PHP session data using shared helper
        const parsed = parsePHPSession(sessionData);
        if (!parsed || !parsed.user || !parsed.user.user_id || !parsed.user.role) {
            return next(new Error('User not logged in'));
        }

        // Attach user data to socket
        socket.data.userId = parsed.user.user_id;
        socket.data.role = parsed.user.role;
        socket.data.sessionId = sessionId;

        // Update session TTL (30 minutes = 1800 seconds)
        try { await redisRaw.expire(sessionKey, 1800); } catch (e) { /* ignore */ }

        next();
    } catch (error) {
        console.error('Session authentication error:', error);
        next(new Error('Authentication failed'));
    }
}

// Parsing is delegated to `node/src/utils/phpSession.js`

module.exports = sessionAuth;
