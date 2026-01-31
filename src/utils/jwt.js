const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token
 * @param {Object} payload - User data to encode in token
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(
    payload,
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h' }
  );
};

/**
 * Verify JWT access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};
