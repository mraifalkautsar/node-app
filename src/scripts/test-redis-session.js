/**
 * Test script for Redis-based PHP session reading
 * Run with: node src/scripts/test-redis-session.js
 */

const { redisRaw } = require('../config/redis');
const { parsePHPSession } = require('../utils/phpSession');

async function testRedisSession() {
    console.log('=== Redis Session Read Test ===\n');

    try {
        // Test 1: List all PHP sessions
        console.log('📋 Listing all PHP sessions...');
        const keys = await redisRaw.keys('PHPSESSID:*');
        
        if (keys.length === 0) {
            console.log('⚠️  No PHP sessions found in Redis');
            console.log('   Make sure you have logged in via PHP first!\n');
            process.exit(0);
        }

        console.log(`✅ Found ${keys.length} session(s):\n`);

        // Test 2: Read each session
        for (const key of keys) {
            console.log(`\n--- Session: ${key} ---`);
            const sessionData = await redisRaw.get(key);
            console.log('Raw data:', sessionData);

            // Parse the session using shared helper
            const userData = parsePHPSession(sessionData);
            console.log('Parsed user:', JSON.stringify(userData, null, 2));

            // Check TTL
            const ttl = await redisRaw.ttl(key);
            console.log(`TTL: ${ttl} seconds (${Math.floor(ttl / 60)} minutes)`);
        }

        console.log('\n=== Test Complete ===\n');
        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
testRedisSession();
