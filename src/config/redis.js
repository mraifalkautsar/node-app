// This file has been modified to mock Redis functionality for simplified deployment.

const noOp = () => {};
const asyncNoOp = async () => {};

console.log('⚠️  Redis functionality is disabled via mock configuration.');

// Create a universal mock client that does nothing.
const mockClient = new Proxy({}, {
  get(target, prop) {
    // The .quit() or .disconnect() methods might be expected to return a Promise.
    if (prop === 'quit' || prop === 'disconnect') {
      console.log(`Mock Redis: Call to .${prop}() ignored.`);
      return asyncNoOp;
    }
    // The .duplicate() method should return another mock client.
    if (prop === 'duplicate') {
      return () => mockClient;
    }
    // For all other properties (e.g., .on, .get, .set), return a function that does nothing.
    return noOp;
  }
});

const redis = mockClient;
const redisSub = mockClient;
const redisRaw = mockClient;

// Graceful shutdown function is now a no-op that resolves immediately.
const closeRedis = async () => {
  console.log('✓ Mock Redis: Skipping shutdown as Redis is disabled.');
};

module.exports = {
  redis,
  redisSub,
  redisRaw,
  closeRedis,
};