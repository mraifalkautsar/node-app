#!/usr/bin/env node

/**
 * Session Lifecycle Test
 * Tests: Login → Session Creation → Activity → Logout → Session Cleanup
 */

const { redisRaw } = require('../config/redis');
const { parsePHPSession } = require('../utils/phpSession');

async function testSessionLifecycle() {
    console.log('=== Session Lifecycle Test ===\n');

    try {
        // Step 1: Check for existing sessions
        console.log('📋 Step 1: Checking initial state...');
        const initialSessions = await redisRaw.keys('PHPSESSID:*');
        console.log(`Initial sessions: ${initialSessions.length}\n`);

        // Step 2: Monitor a specific session
        if (initialSessions.length === 0) {
            console.log('⚠️  No sessions found.');
            console.log('   Please login via PHP and run this test again.\n');
            process.exit(0);
        }

        const testSessionKey = initialSessions[0];
        const sessionId = testSessionKey.replace('PHPSESSID:', '');
        
        console.log('🔍 Step 2: Monitoring session lifecycle...');
        console.log(`Session ID: ${sessionId}\n`);

        // Get initial session data
        const initialData = await redisRaw.get(testSessionKey);
        const initialTTL = await redisRaw.ttl(testSessionKey);
        const userData = parsePHPSession(initialData);

        console.log('Initial session data:');
        console.log(`  User ID: ${userData.user?.user_id}`);
        console.log(`  Role: ${userData.user?.role}`);
        console.log(`  Email: ${userData.user?.email}`);
        console.log(`  TTL: ${initialTTL}s (~${Math.floor(initialTTL/60)} minutes)\n`);

        // Step 3: Simulate activity (TTL refresh)
        console.log('⏰ Step 3: Simulating user activity...');
        console.log('   Refreshing TTL to 1800 seconds...');
        await redisRaw.expire(testSessionKey, 1800);
        
        const newTTL = await redisRaw.ttl(testSessionKey);
        console.log(`   ✅ TTL refreshed: ${newTTL}s\n`);

        // Step 4: Wait and check TTL decay
        console.log('⏳ Step 4: Testing TTL decay...');
        console.log('   Waiting 5 seconds...');
        await sleep(5000);
        
        const decayedTTL = await redisRaw.ttl(testSessionKey);
        console.log(`   TTL after 5s: ${decayedTTL}s`);
        console.log(`   Difference: ${newTTL - decayedTTL}s (expected: ~5s)\n`);

        // Step 5: Test session destruction
        console.log('🗑️  Step 5: Testing session cleanup...');
        console.log('   Note: This will destroy the test session!');
        console.log('   To test logout, logout via PHP instead.\n');

        // Ask for confirmation (in real use)
        console.log('   Skipping destruction to keep session alive.');
        console.log('   To test destruction: redis-cli DEL ' + testSessionKey + '\n');

        // Step 6: Verify session still exists
        const stillExists = await redisRaw.exists(testSessionKey);
        console.log(`✅ Step 6: Session still exists: ${stillExists === 1 ? 'Yes' : 'No'}\n`);

        // Step 7: List all sessions
        console.log('📊 Step 7: Final session count...');
        const finalSessions = await redisRaw.keys('PHPSESSID:*');
        console.log(`Total active sessions: ${finalSessions.length}\n`);

        // Display session details
        if (finalSessions.length > 0) {
            console.log('Active sessions:');
            for (const key of finalSessions) {
                const sid = key.replace('PHPSESSID:', '');
                const ttl = await redisRaw.ttl(key);
                const data = await redisRaw.get(key);
                const user = parsePHPSession(data);
                
                console.log(`  - ${sid.substring(0, 32)}... (TTL: ${Math.floor(ttl/60)}m, User: ${user.user?.user_id})`);
            }
        }

        console.log('\n=== ✅ Lifecycle Test Complete ===\n');
        
        console.log('💡 Next steps:');
        console.log('   1. Test logout via PHP: http://localhost:8000/logout');
        console.log('   2. Verify session is removed from Redis');
        console.log('   3. Try connecting to Socket.IO (should fail)\n');

        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

// Parsing delegated to shared phpSession helper

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testSessionLifecycle();
