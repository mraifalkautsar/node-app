const { redis } = require("../config/redis");
const db = require("../config/database");

const CACHE_CONFIG = {
  TTL: 300, // 5 minutes
  KEYS: {
    USER: (userId, flagName) => `flag:user:${userId}:${flagName}`,
    GLOBAL: (flagName) => `flag:global:${flagName}`,
  },
};

// Whitelist of features that can "fail open". Keep this list empty or minimal.
const FAIL_OPEN_WHITELIST = [];

/**
 * The primary public method to check if a feature is enabled for a user.
 * @param {number} userId The ID of the user to check.
 * @param {string} flagName The name of the feature flag.
 * @returns {Promise<object>} An object with 'enabled', 'reason'.
 */
async function checkFeatureFlag(userId, flagName) {
  try {
    return await getFromCacheThenDB(userId, flagName);
  } catch (error) {
    console.error(
      `[FeatureFlags] FATAL ERROR checking ${flagName} for user ${userId}:`,
      error,
    );
    return {
      enabled: FAIL_OPEN_WHITELIST.includes(flagName),
      reason: "System Error: Could not check feature status.",
    };
  }
}

/**
 * Gets flag state from cache. If not found, falls back to DB and populates cache.
 */
async function getFromCacheThenDB(userId, flagName) {
  const userKey = CACHE_CONFIG.KEYS.USER(userId, flagName);
  const globalKey = CACHE_CONFIG.KEYS.GLOBAL(flagName);

  const [userResult, globalResult] = await redis.mget(userKey, globalKey);

  const userFlag = userResult
    ? JSON.parse(userResult)
    : await fetchAndCacheDbFlag("user", userId, flagName);
  const globalFlag = globalResult
    ? JSON.parse(globalResult)
    : await fetchAndCacheDbFlag("global", 0, flagName);

  // Core Logic: User AND Global must be enabled.
  const finalEnabled = userFlag.enabled && globalFlag.enabled;

  return {
    enabled: finalEnabled,
    reason: finalEnabled
      ? null
      : userFlag.enabled
        ? globalFlag.reason
        : userFlag.reason,
  };
}

/**
 * Fetches a single flag setting (user or global) from the database and caches it.
 */
async function fetchAndCacheDbFlag(type, userId, flagName) {
  let flag = { enabled: true, reason: null }; // Default to enabled
  let key = null;

  try {
    if (type === "user") {
      key = CACHE_CONFIG.KEYS.USER(userId, flagName);
      const res = await db.query(
        "SELECT is_enabled, disabled_reason FROM user_feature_access WHERE user_id = $1 AND flag_name = $2",
        [userId, flagName],
      );
      if (res.rows.length > 0) {
        flag = {
          enabled: res.rows[0].is_enabled,
          reason: res.rows[0].disabled_reason,
        };
      }
    } else {
      // global
      key = CACHE_CONFIG.KEYS.GLOBAL(flagName);
      const res = await db.query(
        "SELECT is_enabled, disabled_reason FROM feature_flags WHERE flag_name = $1",
        [flagName],
      );
      if (res.rows.length > 0) {
        flag = {
          enabled: res.rows[0].is_enabled,
          reason: res.rows[0].disabled_reason,
        };
      }
    }

    // Cache the result for next time.
    await redis.setex(key, CACHE_CONFIG.TTL, JSON.stringify(flag));
  } catch (dbError) {
    console.error(
      `[FeatureFlags] DB Read ERROR for ${type} flag ${flagName}:`,
      dbError,
    );
    // On DB error, return a fail-closed flag and do not cache.
    return {
      enabled: FAIL_OPEN_WHITELIST.includes(flagName),
      reason: "System Error: DB read failed.",
    };
  }

  return flag;
}

/**
 * Gets all feature flags for a user, for presentation/UI purposes.
 * Note: This hits the database directly and is not meant for high-frequency checks.
 * The `checkFeatureFlag` function is the performant way to check a flag.
 */
async function getAllUserFlagsForDisplay(userId) {
  try {
    const result = await db.query(
      `SELECT
            ff.flag_name,
            ff.is_enabled as global_enabled,
            ff.disabled_reason as global_reason,
            ufa.is_enabled as user_override_enabled,
            ufa.disabled_reason as user_override_reason,
            CASE WHEN ufa.flag_name IS NOT NULL THEN true ELSE false END as has_override
          FROM feature_flags ff
          LEFT JOIN user_feature_access ufa ON ff.flag_name = ufa.flag_name AND ufa.user_id = $1
          ORDER BY ff.flag_name`,
      [userId],
    );
    return result.rows;
  } catch (e) {
    console.error(
      `[FeatureFlags] Error fetching all flags for user ${userId}:`,
      e,
    );
    return [];
  }
}

/**
 * Invalidates the Redis cache for a given flag.
 * @param {object} options - { userId, flagName }
 */
async function invalidateCache({ userId, flagName }) {
  if (!flagName) return;

  try {
    const keysToDelete = [];
    // When a flag is changed for a user, we delete their specific user flag cache.
    if (userId) {
      keysToDelete.push(CACHE_CONFIG.KEYS.USER(userId, flagName));
    } else {
      // When a global flag is changed, we must delete the global key.
      // This will cause a miss on next check, which then fetches and re-caches the new value.
      keysToDelete.push(CACHE_CONFIG.KEYS.GLOBAL(flagName));
    }

    if (keysToDelete.length > 0) {
      await redis.del(keysToDelete);
      console.log(
        `[FeatureFlags] Invalidated cache for keys: ${keysToDelete.join(", ")}`,
      );
    }
  } catch (error) {
    console.error("[FeatureFlags] Cache invalidation error:", error);
  }
}

/**
 * Gets all feature flags for a user by checking each one individually.
 * @param {number} userId The user ID to check.
 * @returns {Promise<object>} A dictionary of all flags and their status.
 */
async function getUserFeatureFlags(userId) {
  const flags = {};
  // Get all possible flag names from the database
  const flagNamesResult = await db.query("SELECT flag_name FROM feature_flags");
  if (flagNamesResult.rows.length === 0) {
    return flags;
  }
  const flagNames = flagNamesResult.rows.map((r) => r.flag_name);

  // Check each flag individually and assemble the results
  const promises = flagNames.map(async (flagName) => {
    const flagStatus = await checkFeatureFlag(userId, flagName);
    return { [flagName]: flagStatus };
  });

  const results = await Promise.all(promises);

  // Combine the results into a single object
  return results.reduce((acc, curr) => ({ ...acc, ...curr }), {});
}

/**
 * Pre-populates the Redis cache with all feature flags from the database.
 * This is intended to be called on application startup to "warm" the cache.
 */
async function warmCache() {
  console.log("[FeatureFlags] Starting cache warming process...");
  let globalFlagsCached = 0;
  let userFlagsCached = 0;

  try {
    // 1. Fetch all global flags
    const globalFlagsRes = await db.query(
      "SELECT flag_name, is_enabled, disabled_reason FROM feature_flags",
    );

    // 2. Fetch all user-specific flags
    const userFlagsRes = await db.query(
      "SELECT user_id, flag_name, is_enabled, disabled_reason FROM user_feature_access",
    );

    const pipeline = redis.pipeline();

    // 3. Cache global flags
    for (const row of globalFlagsRes.rows) {
      const key = CACHE_CONFIG.KEYS.GLOBAL(row.flag_name);
      const flag = { enabled: row.is_enabled, reason: row.disabled_reason };
      pipeline.setex(key, CACHE_CONFIG.TTL, JSON.stringify(flag));
      globalFlagsCached++;
    }

    // 4. Cache user-specific flags
    for (const row of userFlagsRes.rows) {
      const key = CACHE_CONFIG.KEYS.USER(row.user_id, row.flag_name);
      const flag = { enabled: row.is_enabled, reason: row.disabled_reason };
      pipeline.setex(key, CACHE_CONFIG.TTL, JSON.stringify(flag));
      userFlagsCached++;
    }

    if (globalFlagsCached > 0 || userFlagsCached > 0) {
      await pipeline.exec();
    }

    console.log(
      `[FeatureFlags] Cache warming complete. Cached ${globalFlagsCached} global and ${userFlagsCached} user-specific flags.`,
    );
  } catch (error) {
    console.error(
      "[FeatureFlags] CRITICAL: Failed to warm cache on startup:",
      error,
    );
    // Depending on the desired behavior, we might want to throw the error
    // to prevent the application from starting in a potentially bad state.
  }
}

module.exports = {
  checkFeatureFlag,
  getAllUserFlagsForDisplay,
  invalidateCache,
  getUserFeatureFlags,
  warmCache,
};
