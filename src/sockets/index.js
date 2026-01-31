const sessionAuth = require('./middleware/sessionAuth');
const auctionSocket = require('./auctionSocket');
const chatSocket = require('./chatSocket');
const TimerManager = require('../services/timerManager');
const auctionService = require('../services/auctionService');
const chatService = require('../services/chatService');

/**
 * Initialize all socket event handlers
 * @param {Server} io - Socket.IO server instance
 */
function initializeSocketHandlers(io) {
    const timerManager = new TimerManager(io);
    (async () => {
        try {
            const activeAuctions = await auctionService.getActiveAuctions();

            console.log(`Found ${activeAuctions.length} active auctions, restoring timers...`);

            for (const auction of activeAuctions) {
                if (auction.seconds_since_last_bid !== null) {
                    const remaining = Math.max(0, 15 - auction.seconds_since_last_bid);

                    if (remaining > 0) {
                        timerManager.startTimer(auction.auction_id, remaining);
                        console.log(`Timer recovered for auction ${auction.auction_id}: ${remaining}s`);
                    } else {
                        console.log(`Auction ${auction.auction_id} timer expired, ending now...`);
                        await auctionService.endAuction(auction.auction_id);
                    }
                } else {
                    console.log(`Auction ${auction.auction_id} has no bids, no timer needed`);
                }
            }

            console.log('Timer recovery complete');
        } catch (error) {
            console.error('Error recovering timers:', error);
        }
    })();

    // Apply session authentication middleware
    io.use(sessionAuth);

    io.on('connection', (socket) => {
        const { userId, role } = socket.data;
        console.log(`User connected: ${userId} (${role}) - Socket: ${socket.id}`);

        socket.emit('authenticated', { userId, role });

        // Register auction event handlers
        auctionSocket(io, socket, timerManager);
        chatSocket(io, socket);

        socket.on('disconnect', (reason) => {
            console.log(`User disconnected: ${userId} - Reason: ${reason}`);
        });

        socket.on('error', (error) => {
            console.error(`Socket error for user ${userId}:`, error);
        });
    });

    console.log('Socket event handlers registered');
    
    return timerManager;
}

module.exports = initializeSocketHandlers;
