const auctionService = require('./auctionService');
const { sendNotification } = require('./pushService'); // Import sendNotification

class TimerManager {
    constructor(io) {
        this.timers = new Map();
        this.io = io;
    }

    startTimer(auctionId, duration = 15) {
        this.stopTimer(auctionId);

        const endTime = Date.now() + (duration * 1000);

        // Broadcast end_time once
        this.io.to(`auction_${auctionId}`).emit('timer_update', {
            auction_id: auctionId,
            end_time: endTime,
            server_time: Date.now()
        });

        console.log(`Timer started for auction ${auctionId}: ${duration}s`);
        
        const timerData = { endTime, interval: null, endingSoonNotified: false };
        this.timers.set(auctionId, timerData);

        const interval = setInterval(async () => {
            const currentTimer = this.timers.get(auctionId);
            
            if (!currentTimer) {
                clearInterval(interval);
                return;
            }

            const remainingSeconds = this.getTimeRemaining(auctionId);

            // Ending soon notification
            if (remainingSeconds > 0 && remainingSeconds <= 10 && !currentTimer.endingSoonNotified) {
                currentTimer.endingSoonNotified = true; // prevent re-sending
                try {
                    const auction = await auctionService.getAuctionById(auctionId);
                    if(auction) {
                        const bidders = await auctionService.getBidders(auctionId);
                        const currentBids = await auctionService.getCurrentBids(auctionId, 1);
                        const highestBidder = currentBids[0]?.bidder_id;

                        const notificationPayload = {
                            title: `Auction for "${auction.product_name}" is ending soon!`,
                            body: 'Place your bid now before it is too late!',
                            url: `/app/auctions/${auctionId}`
                        };

                        // Send notification to all bidders except the current highest bidder
                        const biddersToNotify = bidders.filter(bidderId => bidderId !== highestBidder);
                        
                        const notificationPromises = biddersToNotify.map(bidderId => {
                            return sendNotification(bidderId, notificationPayload, 'auction');
                        });
                        await Promise.all(notificationPromises);
                    }
                } catch (e) {
                    console.error("Error sending ending soon notification:", e);
                }
            }

            if (remainingSeconds <= 0) {
                await this.handleTimerEnd(auctionId);
            }
        }, 1000);

        timerData.interval = interval;
    }

    resetTimer(auctionId) {
        const timer = this.timers.get(auctionId)
        if (!timer) return
        
        const now = Date.now()
        const newEndTime = Math.max(timer.endTime, now + 15000)
        
        // update if extended
        if (newEndTime > timer.endTime) {
            timer.endTime = newEndTime
            this.io.to(`auction_${auctionId}`).emit('timer_update', {
                auction_id: auctionId,
                end_time: newEndTime
            })
            this.io.to('auction_list_view').emit('timer_update', {
                auction_id: auctionId,
                end_time: newEndTime
            })
        }

    }


    getTimeRemaining(auctionId) {
        const timer = this.timers.get(auctionId);
        if (!timer) return 0;

        return Math.max(0, Math.ceil((timer.endTime - Date.now()) / 1000));
    }

    getEndTime(auctionId) {
        const timer = this.timers.get(auctionId);
        return timer ? timer.endTime : null;
    }

    stopTimer(auctionId) {
        const timer = this.timers.get(auctionId);
        if (!timer) return;

        clearInterval(timer.interval);
        this.timers.delete(auctionId);
        console.log(`Timer stopped for auction ${auctionId}`);
    }

    async handleTimerEnd(auctionId) {
        this.stopTimer(auctionId);

        try {
            // Race condition protection
            const auction = await auctionService.getAuctionById(auctionId);

            if (!auction) {
                console.log(`Auction ${auctionId} not found`);
                return;
            }

            if (auction.status !== 'active') {
                console.log(`Auction ${auctionId} already ${auction.status}`);
                return;
            }

            console.log(`Ending auction ${auctionId}...`);

            const { winner, orderId } = await auctionService.endAuction(auctionId);

            const endedData = {
                auction_id: auctionId,
                winner_id: winner?.bidder_id || null,
                final_price: winner?.bid_amount || null,
                order_id: orderId || null,
                ended_at: new Date().toISOString()
            };

            this.io.to(`auction_${auctionId}`).emit('auction_ended', endedData);
            this.io.to('auction_list_view').emit('auction_ended', endedData);

            console.log(`Auction ${auctionId} ended. Winner: ${winner?.bidder_id || 'none'}, Order: ${orderId || 'none'}`);
        } catch (error) {
            console.error(`Error ending auction ${auctionId}:`, error);
        }
    }

    getActiveTimers() {
        return Array.from(this.timers.keys());
    }
}

module.exports = TimerManager;
