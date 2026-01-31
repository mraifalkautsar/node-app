const { checkFeatureFlag, getUserFeatureFlags } = require('../services/featureFlagService');

/**
 * Middleware to enforce feature flags
 * Uses Redis-cached feature flag checks
 * Usage: requireFeature('chat_enabled')
 */
const requireFeature = (flagName) => {
  return async (req, res, next) => {
    try {
      const userId = req.user?.user_id || req.session?.user_id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const flagCheck = await checkFeatureFlag(userId, flagName);

      if (!flagCheck.enabled) {
        return res.status(403).json({
          success: false,
          error: 'Feature disabled',
          reason: flagCheck.reason,
          feature: flagName,
        });
      }

      // Attach flag info to request for logging
      req.featureFlag = flagCheck;
      next();
    } catch (error) {
      console.error('Feature flag middleware error:', error);
      // Fail open in case of errors
      next();
    }
  };
};

module.exports = {
  checkFeatureFlag,
  requireFeature,
  getUserFeatureFlags,
};
