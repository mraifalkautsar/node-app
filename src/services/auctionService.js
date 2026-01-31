const { query, transaction } = require('../config/database');
const { sendNotification } = require('./pushService');

const SQL = {
    GET_AUCTION: `
        SELECT a.*, p.product_name, p.description, p.main_image_path,
               s.store_name, s.store_id
        FROM auctions a
        JOIN products p ON a.product_id = p.product_id
        JOIN stores s ON p.store_id = s.store_id
        WHERE a.auction_id = $1`,

    GET_BIDS: `
        SELECT ab.*, u.name as bidder_name
        FROM auction_bids ab
        JOIN users u ON ab.bidder_id = u.user_id
        WHERE ab.auction_id = $1
        ORDER BY ab.bid_time DESC
        LIMIT $2`,

    INSERT_BID: `
        INSERT INTO auction_bids (auction_id, bidder_id, bid_amount, bid_time)
        VALUES ($1, $2, $3, NOW())
        RETURNING *`,

    UPDATE_PRICE: `
        UPDATE auctions 
        SET current_price = $1
        WHERE auction_id = $2`,

    GET_AUCTION_FOR_END: `
        SELECT a.*, p.product_name, p.store_id 
        FROM auctions a
        JOIN products p ON a.product_id = p.product_id
        WHERE a.auction_id = $1`,

    GET_WINNER: `
        SELECT bidder_id, bid_amount 
        FROM auction_bids 
        WHERE auction_id = $1 
        ORDER BY bid_amount DESC, bid_time ASC 
        LIMIT 1`,

    END_AUCTION: `
        UPDATE auctions 
        SET status = 'ended', end_time = NOW(), winner_id = $1
        WHERE auction_id = $2`,

    CREATE_ORDER: `
        INSERT INTO orders (buyer_id, store_id, total_price, shipping_address, status, created_at)
        VALUES ($1, $2, $3, 'Auction Winner - TBD', 'approved', NOW())
        RETURNING order_id`,

    CREATE_ORDER_ITEM: `
        INSERT INTO order_items (order_id, product_id, quantity, price_at_order, subtotal)
        VALUES ($1, $2, $3, $4, $5)`,

    GET_ACTIVE_AUCTIONS: `
        SELECT 
            a.auction_id,
            a.end_time,
            COALESCE(
                EXTRACT(EPOCH FROM (NOW() - 
                    (SELECT bid_time FROM auction_bids 
                     WHERE auction_id = a.auction_id 
                     ORDER BY bid_time DESC LIMIT 1)
                )),
                EXTRACT(EPOCH FROM (NOW() - a.start_time))
            ) as seconds_since_last_bid
        FROM auctions a
        WHERE a.status = 'active'`,

    GET_AUCTION_WITH_SELLER: `
        SELECT a.*, p.store_id, s.user_id as seller_id
        FROM auctions a
        JOIN products p ON a.product_id = p.product_id
        JOIN stores s ON p.store_id = s.store_id
        WHERE a.auction_id = $1`,

    GET_USER_BALANCE: `SELECT balance FROM users WHERE user_id = $1`,
    GET_USER_BALANCE_LOCK: `SELECT balance FROM users WHERE user_id = $1 FOR UPDATE`,
    DEDUCT_BALANCE: `UPDATE users SET balance = balance - $1 WHERE user_id = $2`,
    REFUND_BALANCE: `UPDATE users SET balance = balance + $1 WHERE user_id = $2`,
    GET_PREVIOUS_BID: `
        SELECT bidder_id, bid_amount 
        FROM auction_bids 
        WHERE auction_id = $1 
        ORDER BY bid_amount DESC, bid_time ASC 
        LIMIT 1`
};

class AuctionService {
    async getAuctionById(auctionId) {
        const { rows } = await query(SQL.GET_AUCTION, [auctionId]);
        return rows[0] || null;
    }

    async getCurrentBids(auctionId, limit = 10) {
        const { rows } = await query(SQL.GET_BIDS, [auctionId, limit]);
        return rows;
    }

    async getBidders(auctionId) {
        const { rows } = await query('SELECT DISTINCT bidder_id FROM auction_bids WHERE auction_id = $1', [auctionId]);
        return rows.map(r => r.bidder_id);
    }

    async placeBid(auctionId, bidderId, bidAmount) {
        let prevBidderToNotify = null;
        const newBid = await transaction(async (client) => {
            const { rows: [prevBid] } = await client.query(SQL.GET_PREVIOUS_BID, [auctionId]);
            const { rows: [user] } = await client.query(SQL.GET_USER_BALANCE_LOCK, [bidderId]);
            const balance = user?.balance || 0;

            let amountToDeduct = bidAmount;

            if (prevBid && prevBid.bidder_id === bidderId) {
                amountToDeduct = bidAmount - prevBid.bid_amount;
            }

            if (balance < amountToDeduct) throw new Error('Insufficient balance');

            await client.query(SQL.DEDUCT_BALANCE, [amountToDeduct, bidderId]);

            const bidResult = await client.query(SQL.INSERT_BID, [auctionId, bidderId, bidAmount]);
            await client.query(SQL.UPDATE_PRICE, [bidAmount, auctionId]);

            if (prevBid && prevBid.bidder_id !== bidderId) {
                await client.query(SQL.REFUND_BALANCE, [prevBid.bid_amount, prevBid.bidder_id]);
                prevBidderToNotify = prevBid.bidder_id;
            }

            return bidResult.rows[0];
        });

        if (prevBidderToNotify) {
            this.notifyOutbid(auctionId, prevBidderToNotify).catch(err => console.error("Notify outbid error:", err));
        }
        
        return newBid;
    }

    async notifyOutbid(auctionId, outbidUserId) {
        if (!outbidUserId) return;
    
        try {
            const auction = await this.getAuctionById(auctionId);
            if (!auction) return;
    
            const payload = {
                title: 'You have been outbid!',
                body: `Someone placed a higher bid on "${auction.product_name}".`,
                url: `/app/auctions/${auctionId}`
            };
            
            sendNotification(outbidUserId, payload, 'auction');
        } catch (error) {
            console.error(`Failed to send outbid notification for auction ${auctionId}`, error);
        }
    }

    async validateBid(auctionId, bidderId, bidAmount) {
        const auction = await this.getAuctionById(auctionId);

        if (!auction) {
            return { valid: false, error: 'Auction not found' };
        }

        if (auction.status !== 'active') {
            return { valid: false, error: `Auction is ${auction.status}` };
        }

        const currentPrice = parseFloat(auction.current_price);
        const minIncrement = parseFloat(auction.min_increment);
        const minBid = currentPrice + minIncrement;

        if (bidAmount < minBid) {
            return {
                valid: false,
                error: `Bid must be at least ${minBid} (current: ${currentPrice} + increment: ${minIncrement})`
            };
        }

        const { rows: [user] } = await query(SQL.GET_USER_BALANCE, [bidderId]);
        const balance = parseFloat(user?.balance || 0);

        const { rows: [prevBid] } = await query(SQL.GET_PREVIOUS_BID, [auctionId]);

        let requiredBalance = bidAmount;
        if (prevBid && prevBid.bidder_id === bidderId) {
            requiredBalance = bidAmount - parseFloat(prevBid.bid_amount);
        }

        if (balance < requiredBalance) {
            return { valid: false, error: `Insufficient balance. Required: ${requiredBalance}, Available: ${balance}` };
        }

        return { valid: true };
    }

    // Atomic transaction
    async endAuction(auctionId) {
        const result = await transaction(async (trx) => {
            const { rows: auctionRows } = await trx.query(SQL.GET_AUCTION_FOR_END, [auctionId]);
            const auction = auctionRows[0];

            if (!auction) throw new Error('Auction not found');

            const { rows: bidRows } = await trx.query(SQL.GET_WINNER, [auctionId]);
            const winner = bidRows[0];

            await trx.query(SQL.END_AUCTION, [winner?.bidder_id || null, auctionId]);

            let orderId = null;
            if (winner) {
                const { rows: orderRows } = await trx.query(SQL.CREATE_ORDER, [
                    winner.bidder_id,
                    auction.store_id,
                    winner.bid_amount
                ]);

                orderId = orderRows[0].order_id;

                await trx.query(SQL.CREATE_ORDER_ITEM, [
                    orderId,
                    auction.product_id,
                    auction.quantity,
                    winner.bid_amount,
                    winner.bid_amount
                ]);
            }

            return { winner, orderId, auction }; // Pass auction info out of transaction
        });

        // Send notification after transaction
        if (result.winner) {
            const payload = {
                title: 'You won an auction!',
                body: `Congratulations! You won the auction for "${result.auction.product_name}" for Rp ${result.winner.bid_amount}.`,
                url: `/app/orders/${result.orderId}` // Assuming an order detail page exists
            };
            sendNotification(result.winner.bidder_id, payload, 'auction').catch(err => console.error("Notify winner error:", err));
        }

        return { winner: result.winner, orderId: result.orderId };
    }

    async getActiveAuctions() {
        const { rows } = await query(SQL.GET_ACTIVE_AUCTIONS);
        return rows;
    }

    async stopAuction(auctionId, sellerId) {
        return await transaction(async (trx) => {
            const { rows } = await trx.query(SQL.GET_AUCTION_WITH_SELLER, [auctionId]);
            const auction = rows[0];

            if (!auction) throw new Error('Auction not found');
            if (auction.seller_id !== sellerId) throw new Error('Not authorized');
            if (auction.status !== 'active') throw new Error(`Cannot stop ${auction.status} auction`);

            const { rows: bidRows } = await trx.query(SQL.GET_WINNER, [auctionId]);
            const winner = bidRows[0];

            if (winner) {
                throw new Error('Cannot manually stop auction with bids. It will auto-end after 15 seconds.');
            }

            await trx.query(SQL.END_AUCTION, [null, auctionId]);

            return { winner: null, orderId: null, stopped_by: 'seller' };
        });
    }

    async startScheduledAuctions() {
        const { rows } = await query(`
            UPDATE auctions 
            SET status = 'active' 
            WHERE status = 'scheduled' AND start_time <= $1
            RETURNING auction_id, product_id, starting_price, current_price, 
                      start_time, end_time, min_increment, quantity
        `, [new Date().toISOString()]);

        return rows;
    }
}

module.exports = new AuctionService();
