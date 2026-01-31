const auctionService = require('../services/auctionService');
const { setSchedulerCallback } = require('../routes/internal');

function startAuctionScheduler(io, timerManager) {
    console.log('Auction scheduler started (60s interval)');

    const checkAndStartAuctions = async () => {
        try {
            const rows = await auctionService.startScheduledAuctions();

            if (rows.length === 0) return;

            console.log(`[Scheduler] ${rows.length} auction(s) started`);

            rows.forEach(auction => {
                io.to('auction_list_view').emit('auction_started', {
                    auction_id: auction.auction_id,
                    auction: {
                        auction_id: auction.auction_id,
                        starting_price: parseInt(auction.starting_price),
                        current_price: parseInt(auction.current_price),
                        start_time: auction.start_time,
                        end_time: auction.end_time,
                        status: 'active'
                    }
                });
            });
        } catch (err) {
            console.error('[Scheduler] Failed to start auctions:', err.message);
        }
    };

    setInterval(checkAndStartAuctions, 60000);
    setSchedulerCallback(checkAndStartAuctions);
}

module.exports = startAuctionScheduler;
