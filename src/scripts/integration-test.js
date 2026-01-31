#!/usr/bin/env node

/**
 * Integration Test: End-to-End Session Flow
 * Tests: PHP Login → Redis Session → Socket.IO Auth
 */

const { redisRaw } = require("../config/redis");
const { parsePHPSession } = require("../utils/phpSession");
const io = require("socket.io-client");

// Test configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:8000";
const SOCKET_URL = process.env.SOCKET_URL || "http://localhost:3000";

async function runIntegrationTest() {
  console.log("=== Integration Test: Redis Session Sharing ===\n");

  try {
    // Step 1: Check Redis connectivity
    console.log("📡 Step 1: Testing Redis connectivity...");
    await redisRaw.ping();
    console.log("✅ Redis is connected\n");

    // Step 2: List existing sessions
    console.log("📋 Step 2: Checking existing PHP sessions...");
    const sessionKeys = await redisRaw.keys("PHPSESSID:*");
    console.log(`Found ${sessionKeys.length} active session(s)\n`);

    if (sessionKeys.length === 0) {
      console.log("⚠️  No active sessions found.");
      console.log("   Please login via PHP first:");
      console.log(`   Visit: ${BASE_URL}/login\n`);
      console.log("   Then re-run this test.\n");
      process.exit(0);
    }

    // Step 3: Test each session with Socket.IO
    console.log("🔌 Step 3: Testing Socket.IO authentication...\n");

    for (const sessionKey of sessionKeys) {
      const sessionId = sessionKey.replace("PHPSESSID:", "");
      console.log(
        `\n--- Testing session: ${sessionId.substring(0, 16)}... ---`,
      );

      // Read session data
      const sessionData = await redisRaw.get(sessionKey);
      const userData = parsePHPSession(sessionData);

      console.log("Session data:", {
        user_id: userData.user?.user_id,
        role: userData.user?.role,
        email: userData.user?.email,
      });

      // Test Socket.IO connection
      await testSocketIOConnection(sessionId, userData);

      // Check TTL
      const ttl = await redisRaw.ttl(sessionKey);
      console.log(`Session TTL: ${ttl}s (~${Math.floor(ttl / 60)} minutes)`);
    }

    console.log("\n\n=== ✅ All Tests Passed ===\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * Test Socket.IO connection with session cookie
 */
function testSocketIOConnection(sessionId, userData) {
  return new Promise((resolve, reject) => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: false,
      timeout: 5000,
      auth: {
        sessionId: sessionId,
      },
    });

    socket.on("connect", () => {
      console.log(`✅ Socket connected for user: ${userData.user?.user_id}`);
      socket.disconnect();
      resolve();
    });

    socket.on("connect_error", (err) => {
      console.error(`❌ Socket connection failed: ${err.message}`);
      socket.disconnect();
      reject(err);
    });

    setTimeout(() => {
      if (!socket.connected) {
        socket.disconnect();
        reject(new Error("Socket connection timed out."));
      }
    }, 5000);
  });
}
