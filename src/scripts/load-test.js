#!/usr/bin/env node

/**
 * Load Test: Concurrent Socket.IO Connections
 * Simulates multiple concurrent users connecting via Socket.IO
 */

const { redisRaw } = require('../config/redis');
const io = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';
const CONCURRENT_CONNECTIONS = parseInt(process.env.CONNECTIONS || '10', 10);
const TEST_DURATION = parseInt(process.env.DURATION || '30', 10); // seconds

async function runLoadTest() {
    console.log('=== Load Test: Concurrent Socket.IO Connections ===\n');
    console.log(`Configuration:`);
    console.log(`  Socket URL: ${SOCKET_URL}`);
    console.log(`  Concurrent Connections: ${CONCURRENT_CONNECTIONS}`);
    console.log(`  Test Duration: ${TEST_DURATION}s\n`);

    try {
        // Get available sessions
        const sessionKeys = await redisRaw.keys('PHPSESSID:*');
        
        if (sessionKeys.length === 0) {
            console.log('❌ No active sessions found.');
            console.log('   Please login via PHP first.\n');
            process.exit(1);
        }

        console.log(`Found ${sessionKeys.length} session(s)\n`);

        // Create connections
        const stats = {
            connected: 0,
            failed: 0,
            errors: 0,
            totalLatency: 0,
            connections: []
        };

        console.log('🚀 Starting connections...\n');

        const startTime = Date.now();

        // Create connections (distribute across available sessions)
        for (let i = 0; i < CONCURRENT_CONNECTIONS; i++) {
            const sessionKey = sessionKeys[i % sessionKeys.length];
            const sessionId = sessionKey.replace('PHPSESSID:', '');

            createConnection(sessionId, i, stats);
            
            // Stagger connections slightly to avoid overwhelming the server
            if (i < CONCURRENT_CONNECTIONS - 1) {
                await sleep(50);
            }
        }

        // Monitor for test duration
        await monitorTest(stats, TEST_DURATION);

        // Cleanup
        stats.connections.forEach(socket => {
            if (socket && socket.connected) {
                socket.close();
            }
        });

        // Report results
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        console.log('\n\n=== Test Results ===');
        console.log(`Duration: ${duration.toFixed(2)}s`);
        console.log(`Connections Attempted: ${CONCURRENT_CONNECTIONS}`);
        console.log(`✅ Successful: ${stats.connected}`);
        console.log(`❌ Failed: ${stats.failed}`);
        console.log(`⚠️  Errors: ${stats.errors}`);
        console.log(`Average Latency: ${stats.connected > 0 ? (stats.totalLatency / stats.connected).toFixed(2) : 0}ms`);
        console.log(`Success Rate: ${((stats.connected / CONCURRENT_CONNECTIONS) * 100).toFixed(2)}%\n`);

        // Check Redis stats
        const finalSessionCount = (await redisRaw.keys('PHPSESSID:*')).length;
        console.log(`Active Sessions in Redis: ${finalSessionCount}\n`);

        process.exit(stats.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Load test failed:', error.message);
        process.exit(1);
    }
}

/**
 * Create a Socket.IO connection
 */
function createConnection(sessionId, index, stats) {
    const connectStart = Date.now();
    
    const socket = io(SOCKET_URL, {
        transports: ['websocket'],
        extraHeaders: {
            cookie: `PHPSESSID=${sessionId}`
        },
        reconnection: false,
        timeout: 10000
    });

    socket.on('connect', () => {
        const latency = Date.now() - connectStart;
        stats.connected++;
        stats.totalLatency += latency;
        console.log(`✅ Connection ${index + 1}: Connected (${latency}ms)`);
    });

    socket.on('connect_error', (error) => {
        stats.failed++;
        console.log(`❌ Connection ${index + 1}: Failed - ${error.message}`);
    });

    socket.on('error', () => {
        stats.errors++;
    });

    stats.connections.push(socket);
}

/**
 * Monitor test and display progress
 */
async function monitorTest(stats, duration) {
    const interval = 2; // seconds
    const iterations = Math.ceil(duration / interval);

    for (let i = 0; i < iterations; i++) {
        await sleep(interval * 1000);
        
        const elapsed = (i + 1) * interval;
        console.log(`\n[${elapsed}s] Connected: ${stats.connected}, Failed: ${stats.failed}, Errors: ${stats.errors}`);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the load test
runLoadTest();
