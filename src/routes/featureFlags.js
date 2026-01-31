const express = require("express");
const router = express.Router();
const {
  checkFeatureFlag,
  getUserFeatureFlags,
} = require("../services/featureFlagService");
const { getUserFromRequest } = require("../utils/phpSession");

// Middleware to get user from session
async function useSessionUser(req, res, next) {
  try {
    const info = await getUserFromRequest(req);
    if (!info || !info.user) {
      return res
        .status(401)
        .json({ success: false, error: "Not authenticated" });
    }
    req.user = info.user;
    next();
  } catch (err) {
    console.error("Session check error in middleware:", err);
    return res
      .status(500)
      .json({ success: false, error: "Failed to process session" });
  }
}

/**
 * @swagger
 * /feature-flags/me:
 *   get:
 *     summary: Get all feature flags for the current session user
 *     tags: [Feature Flags]
 *     responses:
 *       200:
 *         description: A list of feature flags for the current user.
 */
router.get("/me", useSessionUser, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const flags = await getUserFeatureFlags(userId);

    res.json({
      success: true,
      data: {
        flags,
        user_id: userId,
      },
    });
  } catch (error) {
    console.error("Get user feature flags error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get feature flags for current user",
    });
  }
});

/**
 * @swagger
 * /feature-flags/me/{flagName}:
 *   get:
 *     summary: Check a single feature flag for the current session user
 *     tags: [Feature Flags]
 *     parameters:
 *       - in: path
 *         name: flagName
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The result of the feature flag check.
 */
router.get("/me/:flagName", useSessionUser, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { flagName } = req.params;

    const flagResult = await checkFeatureFlag(userId, flagName);

    res.json({
      success: true,
      data: {
        flag: flagResult,
        user_id: userId,
        flag_name: flagName,
      },
    });
  } catch (error) {
    console.error("Feature flag check error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check feature flag for current user",
    });
  }
});

/**
 * @swagger
 * /feature-flags/check:
 *   get:
 *     summary: Check a single feature flag for a user
 *     tags: [Feature Flags]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: flag
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: The result of the feature flag check.
 */
router.get("/check", async (req, res) => {
  try {
    const { user_id, flag } = req.query;

    if (!user_id || !flag) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: user_id and flag",
      });
    }

    const userId = parseInt(user_id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user_id",
      });
    }

    const flagResult = await checkFeatureFlag(userId, flag);

    res.json({
      success: true,
      data: {
        flag: flagResult,
        user_id: userId,
        flag_name: flag,
      },
    });
  } catch (error) {
    console.error("Feature flag check error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check feature flag",
    });
  }
});

/**
 * @swagger
 * /feature-flags:
 *   get:
 *     summary: Get all feature flags for a user
 *     tags: [Feature Flags]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of feature flags for the user.
 */
router.get("/", async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameter: user_id",
      });
    }

    const userId = parseInt(user_id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid user_id",
      });
    }

    const flags = await getUserFeatureFlags(userId);

    res.json({
      success: true,
      data: {
        flags,
        user_id: userId,
      },
    });
  } catch (error) {
    console.error("Get user feature flags error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get feature flags",
    });
  }
});

module.exports = router;
