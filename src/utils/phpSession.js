const { redisRaw } = require('../config/redis');

/**
 * Lightweight utilities to read and parse PHP sessions stored in Redis.
 * Provides functions to:
 * - fetch raw session blob by PHPSESSID
 * - parse PHP session format into JS object
 * - extract user object from session
 * - Express middleware to attach session user to req
 */

function parsePHPArray(str) {
    const obj = {};
    if (!str) return obj;

    const userIdMatch = str.match(/s:\d+:"user_id";i:(\d+);/);
    if (userIdMatch) obj.user_id = parseInt(userIdMatch[1], 10);

    const roleMatch = str.match(/s:\d+:"role";s:\d+:"([^"]+)";/);
    if (roleMatch) obj.role = roleMatch[1];

    const emailMatch = str.match(/s:\d+:"email";s:\d+:"([^"]+)";/);
    if (emailMatch) obj.email = emailMatch[1];

    const nameMatch = str.match(/s:\d+:"name";s:\d+:"([^"]+)";/);
    if (nameMatch) obj.name = nameMatch[1];

    return obj;
}

function parsePHPSession(data) {
    const result = {};
    if (!data || typeof data !== 'string') return result;

    const parts = data.split(/([a-zA-Z_][a-zA-Z0-9_]*)\|/);
    for (let i = 1; i < parts.length; i += 2) {
        const key = parts[i];
        const value = parts[i + 1] || '';

        if (key === 'user') {
            result.user = parsePHPArray(value);
        } else {
            // store raw fallback for other keys
            result[key] = value;
        }
    }

    return result;
}

async function getSessionById(sessionId) {
    if (!sessionId) return null;
    const key = `PHPSESSID:${sessionId}`;
    try {
        const raw = await redisRaw.get(key);
        return raw || null;
    } catch (err) {
        throw err;
    }
}

function parseSessionCookie(cookieHeader) {
    if (!cookieHeader) return null;
    const m = cookieHeader.match(/PHPSESSID=([^;\s]+)/);
    return m ? m[1] : null;
}

/**
 * Convenience helper: resolve a PHP session user from an Express request
 *
 * Input: an Express `req` object (reads `req.headers.cookie`)
 * Output: Promise resolving to `{ user, sessionId, raw }` or `null` when no valid session found
 *
 * @param {Object} req - Express request object
 * @returns {Promise<{user: Object|null, sessionId: string, raw: string}|null>}
 */
async function getUserFromRequest(req) {
    const cookies = req.headers && req.headers.cookie;
    const sid = parseSessionCookie(cookies);
    if (!sid) return null;

    const raw = await getSessionById(sid);
    if (!raw) return null;

    const parsed = parsePHPSession(raw);
    const user = parsed.user || null;

    return { user, sessionId: sid, raw };
}

/**
 * Express middleware: attach `req.sessionUser` when PHP session is valid.
 * Also refreshes the session TTL in Redis (default 1800s) when present.
 */
function phpSessionMiddleware(options = {}) {
    const ttl = options.ttlSeconds || 1800;
    return async (req, res, next) => {
        try {
            const cookies = req.headers && req.headers.cookie;
            const sid = parseSessionCookie(cookies);
            if (!sid) return next();

            const raw = await getSessionById(sid);
            if (!raw) return next();

            const parsed = parsePHPSession(raw);
            if (parsed.user && parsed.user.user_id) {
                req.sessionUser = parsed.user;
                req.sessionId = sid;
                // Refresh TTL
                try { await redisRaw.expire(`PHPSESSID:${sid}`, ttl); } catch (e) { /* ignore */ }
            }
        } catch (err) {
            // don't block request on session lookup error
            console.error('phpSessionMiddleware error:', err);
        }
        next();
    };
}

module.exports = {
    parsePHPSession,
    parsePHPArray,
    getSessionById,
    getUserFromRequest,
    phpSessionMiddleware,
};
