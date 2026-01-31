#!/usr/bin/env node

/**
 * Redis Session Monitor
 * Real-time monitoring of Redis sessions and memory usage
 */

const { redis, redisRaw } = require('../config/redis');
const { parsePHPSession } = require('../utils/phpSession');

const REFRESH_INTERVAL = parseInt(process.env.INTERVAL || '2', 10); // seconds

async function monitorRedis() {
    console.clear();
    console.log('=== Redis Session Monitor ===');
    console.log('Press Ctrl+C to exit\n');

    let iteration = 0;

    const monitor = async () => {
        try {
            iteration++;
            
            // Get session count
            const sessionKeys = await redisRaw.keys('PHPSESSID:*');
            const sessionCount = sessionKeys.length;

            // Get cache keys count (with nimons: prefix)
            const cacheKeys = await redis.keys('*');
            const cacheCount = cacheKeys.length;

            // Get memory info
            const memoryInfo = await redis.info('memory');
            const usedMemory = parseMemoryInfo(memoryInfo, 'used_memory_human');
            const peakMemory = parseMemoryInfo(memoryInfo, 'used_memory_peak_human');

            // Get stats
            const statsInfo = await redis.info('stats');
            const totalConnections = parseStatsInfo(statsInfo, 'total_connections_received');
            const totalCommands = parseStatsInfo(statsInfo, 'total_commands_processed');

            // Get clients info
            const clientsInfo = await redis.info('clients');
            const connectedClients = parseStatsInfo(clientsInfo, 'connected_clients');

            // Clear and display
            console.clear();
            console.log('=== Redis Session Monitor ===');
            console.log(`Iteration: ${iteration} | Refresh every ${REFRESH_INTERVAL}s\n`);

            console.log('📊 Sessions:');
            console.log(`   PHP Sessions (PHPSESSID:*): ${sessionCount}`);
            console.log(`   Cache Keys (nimons:*): ${cacheCount}`);
            console.log(`   Total Keys: ${sessionCount + cacheCount}\n`);

            console.log('💾 Memory:');
            console.log(`   Used: ${usedMemory}`);
            console.log(`   Peak: ${peakMemory}\n`);

            console.log('📈 Statistics:');
            console.log(`   Connected Clients: ${connectedClients}`);
            console.log(`   Total Connections: ${totalConnections}`);
            console.log(`   Total Commands: ${totalCommands}\n`);

            // List active sessions with details
            if (sessionCount > 0) {
                console.log('🔑 Active Sessions:');
                console.log('─'.repeat(80));
                console.log('Session ID                      | TTL (min) | User ID | Role   | Email');
                console.log('─'.repeat(80));

                for (const key of sessionKeys.slice(0, 10)) { // Show max 10
                    const sessionId = key.replace('PHPSESSID:', '');
                    const ttl = await redisRaw.ttl(key);
                    const sessionData = await redisRaw.get(key);
                    const userData = parsePHPSession(sessionData);

                    const displayId = sessionId.substring(0, 30) + '..';
                    const displayTtl = Math.floor(ttl / 60);
                    const displayUserId = (userData.user?.user_id || 'N/A').toString().padEnd(7);
                    const displayRole = (userData.user?.role || 'N/A').padEnd(6);
                    const displayEmail = (userData.user?.email || 'N/A').substring(0, 25);

                    console.log(`${displayId} | ${String(displayTtl).padStart(9)} | ${displayUserId} | ${displayRole} | ${displayEmail}`);
                }

                if (sessionCount > 10) {
                    console.log(`... and ${sessionCount - 10} more session(s)`);
                }
                console.log('─'.repeat(80));
            }

            console.log('\nPress Ctrl+C to exit');

        } catch (error) {
            console.error('Monitor error:', error.message);
        }
    };

    // Initial run
    await monitor();

    // Set up interval
    setInterval(monitor, REFRESH_INTERVAL * 1000);
}

/**
 * Parse memory info from Redis INFO output
 */
function parseMemoryInfo(info, key) {
    const match = info.match(new RegExp(`${key}:(.+)`));
    return match ? match[1].trim() : 'N/A';
}

/**
 * Parse stats info from Redis INFO output
 */
function parseStatsInfo(info, key) {
    const match = info.match(new RegExp(`${key}:(\\d+)`));
    return match ? match[1] : 'N/A';
}

// Parsing delegated to shared phpSession helper

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n\nShutting down monitor...');
    process.exit(0);
});

// Run the monitor
monitorRedis();
