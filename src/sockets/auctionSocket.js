const auctionService = require('../services/auctionService');
const { validateJoinRoom, validatePlaceBid, validateGetTimer, ValidationError } = require('../validators/auctionValidator');

/**
 * Auction Socket Event Handlers
 * Handles join_room and place_bid events
 */
function auctionSocket(io, socket, timerManager) {
    const { userId, role } = socket.data;

    /**
     * Event: join_room
     * User joins an auction room to receive real-time updates
     */
    socket.on('join_room', async (data) => {
        try {
            const { auction_id } = validateJoinRoom(data);

            // Validate auction exists
            const auction = await auctionService.getAuctionById(auction_id);

            if (!auction) {
                return socket.emit('error', { message: 'Auction not found' });
            }

            // Join Socket.IO room
            const roomName = `auction_${auction_id}`;
            socket.join(roomName);

            // Get current bids
            const bids = await auctionService.getCurrentBids(auction_id);
            const endTime = timerManager.getEndTime(auction_id);

            // Send current auction state to user
            socket.emit('auction_state', {
                auction,
                bids,
                total_bidders: bids.length > 0 ? new Set(bids.map(b => b.bidder_id)).size : 0,
                end_time: endTime,
                server_time: Date.now()
            });

            // Broadcast to room that user joined
            socket.to(roomName).emit('user_joined', {
                user_id: userId,
                auction_id,
            });

            console.log(`User ${userId} joined auction room: ${roomName}`);
        } catch (error) {
            console.error('join_room error:', error);
            if (error instanceof ValidationError) {
                return socket.emit('error', { message: error.message });
            }
            socket.emit('error', { message: 'Failed to join auction room' });
        }
    });

    socket.on('join_auction_list', () => {
        socket.join('auction_list_view');
    });

    socket.on('leave_auction_list', () => {
        socket.leave('auction_list_view');
    });


    /**
     * Event: place_bid
     * User places a bid on an auction
     */
    socket.on('place_bid', async (data) => {
        try {
            const { auction_id, bid_amount } = validatePlaceBid(data);

            // Validate bid
            const validation = await auctionService.validateBid(auction_id, userId, bid_amount);

            if (!validation.valid) {
                return socket.emit('bid_error', { message: validation.error });
            }

            // Place bid (atomic transaction)
            const bid = await auctionService.placeBid(auction_id, userId, bid_amount);

            const bids = await auctionService.getCurrentBids(auction_id, 1);
            if (bids.length === 1) {
                timerManager.startTimer(auction_id, 15);
            } else {
                timerManager.resetTimer(auction_id);
            }

            // Emit success to bidder
            socket.emit('bid_placed', {
                success: true,
                bid_id: bid.bid_id,
                auction_id,
                bidder_id: userId,
                bid_amount,
                bid_time: bid.bid_time,
            });

            // Broadcast new bid to all users in the room
            const roomName = `auction_${auction_id}`;
            const bidData = {
                bid_id: bid.bid_id,
                auction_id,
                bidder_id: userId,
                bid_amount,
                bid_time: bid.bid_time,
                current_price: bid_amount,
                total_bidders: bid.total_bidders || 1
            };

            io.to(roomName).emit('new_bid', bidData);

            io.to('auction_list_view').emit('auction_list_update', {
                auction_id,
                current_price: bid_amount,
                total_bidders: bid.total_bidders || 1
            });

            console.log(`User ${userId} placed bid ${bid_amount} on auction ${auction_id}`);
        } catch (error) {
            console.error('place_bid error:', error);
            socket.emit('bid_error', { message: 'Failed to place bid' });
        }
    });

    socket.on('get_timer', (data) => {
        try {
            const { auction_id } = data;

            if (!auction_id) {
                return socket.emit('error', { message: 'auction_id is required' });
            }

            const endTime = timerManager.getEndTime(auction_id);
            const remaining = timerManager.getTimeRemaining(auction_id);

            socket.emit('timer_sync', {
                auction_id,
                end_time: endTime,
                time_remaining: remaining,
                server_time: Date.now()
            });
        } catch (error) {
            console.error('get_timer error:', error);
            socket.emit('error', { message: 'Failed to get timer' });
        }
    });

    socket.on('stop_auction', async (data) => {
        try {
            const { auction_id } = data;

            if (!auction_id) {
                return socket.emit('error', { message: 'auction_id is required' });
            }

            if (role !== 'SELLER') {
                return socket.emit('error', { message: 'Only sellers can stop auctions' });
            }

            const result = await auctionService.stopAuction(auction_id, userId);
            timerManager.stopTimer(auction_id);

            const roomName = `auction_${auction_id}`;
            const auctionEndedData = {
                auction_id,
                winner_id: result.winner?.bidder_id || null,
                final_price: result.winner?.bid_amount || null,
                order_id: result.orderId || null,
                stopped_by: 'seller',
                ended_at: new Date().toISOString()
            };
            io.to(roomName).emit('auction_ended', auctionEndedData);
            io.to('auction_list_view').emit('auction_ended', auctionEndedData);

            socket.emit('auction_stopped', { success: true, ...result });

            console.log(`Seller ${userId} stopped auction ${auction_id}`);
        } catch (error) {
            console.error('stop_auction error:', error);
            socket.emit('error', { message: error.message || 'Failed to stop auction' });
        }
    });
}

module.exports = auctionSocket;
