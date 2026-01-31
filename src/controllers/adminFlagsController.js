const db = require("../config/database");
const {
  getAllUserFlagsForDisplay,
  invalidateCache,
} = require("../services/featureFlagService");

/**
 * Get all global feature flags
 */
const getGlobalFlags = async (req, res) => {
  try {
    // We can use the same function as getting user flags, just with a non-existent user ID
    // or by directly querying the feature_flags table. Let's be explicit for clarity.
    const result = await db.query(
      `SELECT flag_name, is_enabled, disabled_reason, updated_at, updated_by
       FROM feature_flags
       ORDER BY flag_name`,
    );

    res.json({
      success: true,
      data: {
        flags: result.rows,
      },
    });
  } catch (error) {
    console.error("Get global flags error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch feature flags",
    });
  }
};

/**
 * Enable a global feature flag
 */
const enableGlobalFlag = async (req, res) => {
  try {
    const { flag_name } = req.body;
    const adminId = req.user.user_id; // from auth middleware

    await db.query(
      `INSERT INTO feature_flags (flag_name, is_enabled, disabled_reason, updated_by)
       VALUES ($1, TRUE, NULL, $2)
       ON CONFLICT (flag_name)
       DO UPDATE SET is_enabled = TRUE, disabled_reason = NULL, updated_at = NOW(), updated_by = $2`,
      [flag_name, adminId],
    );

    await invalidateCache({ flagName: flag_name });

    res.json({
      success: true,
      message: `Feature flag '${flag_name}' enabled globally`,
    });
  } catch (error) {
    console.error("Enable global flag error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to enable feature flag",
    });
  }
};

/**
 * Disable a global feature flag
 */
const disableGlobalFlag = async (req, res) => {
  try {
    const { flag_name, reason } = req.body;
    const adminId = req.user.user_id;

    if (!reason || reason.trim().length < 10) {
      return res
        .status(400)
        .json({
          success: false,
          error: "A reason of at least 10 characters is required.",
        });
    }

    await db.query(
      `INSERT INTO feature_flags (flag_name, is_enabled, disabled_reason, updated_by)
       VALUES ($1, FALSE, $2, $3)
       ON CONFLICT (flag_name)
       DO UPDATE SET is_enabled = FALSE, disabled_reason = $2, updated_at = NOW(), updated_by = $3`,
      [flag_name, reason, adminId],
    );

    await invalidateCache({ flagName: flag_name });

    res.json({
      success: true,
      message: `Feature flag '${flag_name}' disabled globally`,
    });
  } catch (error) {
    console.error("Disable global flag error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to disable feature flag",
    });
  }
};

/**
 * Get user-specific feature flags
 */
const getUserFlags = async (req, res) => {
  try {
    const { id } = req.params;
    const flags = await getAllUserFlagsForDisplay(id);
    res.json({
      success: true,
      data: {
        userId: parseInt(id),
        flags: flags,
      },
    });
  } catch (error) {
    console.error("Get user flags error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user feature flags",
    });
  }
};

/**
 * Disable feature for specific user
 */
const disableUserFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { flag_name, reason } = req.body;
    const adminId = req.user.user_id;

    if (!reason || reason.trim().length < 10) {
      return res
        .status(400)
        .json({
          success: false,
          error: "A reason of at least 10 characters is required.",
        });
    }

    await db.query(
      `INSERT INTO user_feature_access (user_id, flag_name, is_enabled, disabled_reason, updated_by)
       VALUES ($1, $2, FALSE, $3, $4)
       ON CONFLICT (user_id, flag_name)
       DO UPDATE SET is_enabled = FALSE, disabled_reason = $3, updated_at = NOW(), updated_by = $4`,
      [id, flag_name, reason, adminId],
    );

    await invalidateCache({ userId: id, flagName: flag_name });

    res.json({
      success: true,
      message: `Feature flag '${flag_name}' disabled for user ${id}`,
    });
  } catch (error) {
    console.error("Disable user flag error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to disable user feature flag",
    });
  }
};

/**
 * Enable feature for specific user
 */
const enableUserFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { flag_name } = req.body;
    const adminId = req.user.user_id;

    await db.query(
      `INSERT INTO user_feature_access (user_id, flag_name, is_enabled, disabled_reason, updated_by)
       VALUES ($1, $2, TRUE, NULL, $3)
       ON CONFLICT (user_id, flag_name)
       DO UPDATE SET is_enabled = TRUE, disabled_reason = NULL, updated_at = NOW(), updated_by = $3`,
      [id, flag_name, adminId],
    );

    await invalidateCache({ userId: id, flagName: flag_name });

    res.json({
      success: true,
      message: `Feature flag '${flag_name}' enabled for user ${id}`,
    });
  } catch (error) {
    console.error("Enable user flag error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to enable user feature flag",
    });
  }
};

module.exports = {
  getGlobalFlags,
  enableGlobalFlag,
  disableGlobalFlag,
  getUserFlags,
  disableUserFlag,
  enableUserFlag,
};
