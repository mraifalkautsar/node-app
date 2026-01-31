const app = require('./app');
const { pool } = require('./config/database');
const { closeRedis } = require('./config/redis');
const { warmCache } = require('./services/featureFlagService');
const { Server } = require('socket.io');
const initializeSocketHandlers = require('./sockets');

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, async () => {
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Server running on: http://${HOST}:${PORT}`);
  console.log(`API Base: http://${HOST}:${PORT}/api`);
  
  // Warm cache on startup
  await warmCache();
});

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  connectTimeout: 45000, // 45 seconds
  transports: ['websocket', 'polling'],
});

const startAuctionScheduler = require('./schedulers/auctionScheduler');

// Initialize socket event handlers
const timerManager = initializeSocketHandlers(io);
console.log('WebSocket server initialized');

startAuctionScheduler(io, timerManager);
console.log('Auction scheduler initialized');

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('✓ HTTP server closed');
    
    await closeRedis();
    console.log('✓ Redis connections closed');
    
    await pool.end();
    console.log('✓ Database connections closed');
    
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = server;
