

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

function validateJoinRoom(data) {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('Invalid data format');
    }

    const { auction_id } = data;

    if (!auction_id) {
        throw new ValidationError('auction_id is required');
    }

    if (typeof auction_id !== 'number' || !Number.isInteger(auction_id) || auction_id <= 0) {
        throw new ValidationError('auction_id must be a positive integer');
    }

    return { auction_id };
}

function validatePlaceBid(data) {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('Invalid data format');
    }

    const { auction_id, bid_amount } = data;

    if (!auction_id) {
        throw new ValidationError('auction_id is required');
    }

    if (typeof auction_id !== 'number' || !Number.isInteger(auction_id) || auction_id <= 0) {
        throw new ValidationError('auction_id must be a positive integer');
    }

    if (bid_amount === undefined || bid_amount === null) {
        throw new ValidationError('bid_amount is required');
    }

    if (typeof bid_amount !== 'number' || bid_amount <= 0) {
        throw new ValidationError('bid_amount must be a positive number');
    }

    if (!Number.isFinite(bid_amount)) {
        throw new ValidationError('bid_amount must be a finite number');
    }

    return { auction_id, bid_amount };
}

function validateGetTimer(data) {
    if (!data || typeof data !== 'object') {
        throw new ValidationError('Invalid data format');
    }

    const { auction_id } = data;

    if (!auction_id) {
        throw new ValidationError('auction_id is required');
    }

    if (typeof auction_id !== 'number' || !Number.isInteger(auction_id) || auction_id <= 0) {
        throw new ValidationError('auction_id must be a positive integer');
    }

    return { auction_id };
}

module.exports = {
    ValidationError,
    validateJoinRoom,
    validatePlaceBid,
    validateGetTimer
};
