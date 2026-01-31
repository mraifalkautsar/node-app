const crypto = require('crypto');
const { pool } = require('../config/database');
const soap = require('soap');
const Joi = require('joi');

class PaymentController {
    constructor() {
        this.SERVER_KEY = process.env.SERVER_KEY;
        this.PHP_SOAP_WSDL = process.env.PHP_SOAP_WSDL;
    }

    getValidationSchema() {
        return Joi.object({
            order_id: Joi.string().required(),
            status_code: Joi.string().required(),
            gross_amount: Joi.string().required(),
            signature_key: Joi.string().required(),
            transaction_status: Joi.string().required(),
            payment_type: Joi.string().required(),
            transaction_time: Joi.string().optional(),
            transaction_id: Joi.string().optional(),
            fraud_status: Joi.string().optional(),
            merchant_id: Joi.string().optional(),
            settlement_time: Joi.string().optional(),
            currency: Joi.string().optional(),
            expiry_time: Joi.string().optional(),
            va_numbers: Joi.array().optional(),
            payment_amounts: Joi.array().optional(),
            customer_details: Joi.object().optional(),
        }).unknown(true);
    }

    validateRequest(data) {
        const schema = this.getValidationSchema();
        return schema.validate(data);
    }

    generateSignature(orderId, statusCode, grossAmount) {
        const inputStr = `${orderId}${statusCode}${grossAmount}${this.SERVER_KEY}`;
        return crypto.createHash('sha512').update(inputStr).digest('hex');
    }

    verifySignature(orderId, statusCode, grossAmount, serverSignature) {
        const mySignature = this.generateSignature(orderId, statusCode, grossAmount);
        console.log('Signature verification:', {
            received: serverSignature,
            calculated: mySignature,
            match: mySignature === serverSignature
        });
        return mySignature === serverSignature;
    }

    determineStatus(transactionStatus, paymentType, fraudStatus) {
        let newStatus = null;

        if (transactionStatus === 'capture') {
            if (paymentType === 'credit_card') {
                newStatus = fraudStatus === 'challenge' ? 'challenge' : 'success';
            } else {
                newStatus = 'success';
            }
        } else if (transactionStatus === 'settlement') {
            newStatus = 'success';
        } else if (transactionStatus === 'pending') {
            newStatus = 'pending';
        } else if (['deny', 'cancel', 'failure'].includes(transactionStatus)) {
            newStatus = 'failed';
        } else if (transactionStatus === 'expire') {
            newStatus = 'expired';
        }

        return newStatus;
    }

    async notifyPHPService(data) {
        try {
            console.log('Attempting to notify PHP service via SOAP...');
            const client = await soap.createClientAsync(this.PHP_SOAP_WSDL, {
                endpoint: this.PHP_SOAP_WSDL,
                timeout: 5000
            });
            
            const result = await client.syncPaymentAsync({
                order_id: data.order_id,
                status: data.status,
                user_id: String(data.user_id),
                amount: String(data.amount),
                payment_type: data.payment_type,
                transaction_id: data.transaction_id || '',
                transaction_time: data.transaction_time || ''
            });

            console.log('PHP SOAP service notified successfully:', result);
            return result;
        } catch (error) {
            console.error('SOAP notification failed (non-blocking):', error.message);
        }
    }

    async handleNotification(req, res) {
        let client = null;
        
        try {
            console.log('=== Payment Webhook Received ===');
            console.log('Request Body:', JSON.stringify(req.body, null, 2));

            const { error, value: notification } = this.validateRequest(req.body);

            if (error) {
                console.error('Validation error:', error.details[0].message);
                return res.status(400).json({
                    status: 'error',
                    message: 'Invalid request data',
                    details: error.details[0].message,
                });
            }

            const {
                order_id: orderId,
                status_code: statusCode,
                gross_amount: grossAmount,
                signature_key: serverSignature,
                transaction_status: transactionStatus,
                payment_type: paymentType,
                fraud_status: fraudStatus = '',
                transaction_time: transactionTime,
                transaction_id: transactionId,
            } = notification;

            console.log('Payment Details:', {
                orderId,
                transactionStatus,
                paymentType,
                grossAmount,
                transactionTime,
            });

            if (!this.verifySignature(orderId, statusCode, grossAmount, serverSignature)) {
                console.error('SECURITY: Invalid signature for order:', orderId);
                return res.status(403).json({
                    status: 'error',
                    message: 'Invalid Signature',
                });
            }

            client = await pool.connect();
            console.log('Database client acquired');
            
            await client.query('BEGIN');
            console.log('Transaction started');

            const lockQuery = 'SELECT * FROM topups WHERE order_id = $1 FOR UPDATE';
            console.log('Executing query:', lockQuery, [orderId]);
            
            const { rows: topups } = await client.query(lockQuery, [orderId]);
            console.log('Query result:', topups.length, 'rows found');

            if (topups.length === 0) {
                await client.query('ROLLBACK');
                console.error('Order not found in database:', orderId);
                return res.status(404).json({
                    status: 'error',
                    message: 'Order not found',
                });
            }

            const topup = topups[0];
            console.log('Found topup:', {
                order_id: topup.order_id,
                user_id: topup.user_id,
                amount: topup.amount,
                current_status: topup.status
            });

            if (topup.status === 'success' || topup.status === 'expired') {
                await client.query('ROLLBACK');
                console.log('Transaction already processed:', orderId, 'Current status:', topup.status);
                return res.status(200).json({
                    status: 'ignored',
                    message: 'Transaction already processed',
                    current_status: topup.status,
                });
            }

            const newStatus = this.determineStatus(transactionStatus, paymentType, fraudStatus);
            console.log('Determined new status:', newStatus, 'from transaction_status:', transactionStatus);

            if (!newStatus) {
                await client.query('ROLLBACK');
                console.error('Unknown transaction status:', transactionStatus);
                return res.status(400).json({
                    status: 'error',
                    message: 'Unknown transaction status',
                });
            }

            if (newStatus !== topup.status) {
                console.log(`Status change detected: ${topup.status} -> ${newStatus}`);
                
                const updateTopupQuery = `
                    UPDATE topups 
                    SET status = $1, 
                        payment_type = $2, 
                        updated_at = NOW() 
                    WHERE order_id = $3
                    RETURNING *
                `;
                
                console.log('Updating topup status with params:', [newStatus, paymentType, orderId]);
                const updateResult = await client.query(updateTopupQuery, [
                    newStatus,
                    paymentType,
                    orderId,
                ]);
                
                if (updateResult.rows.length === 0) {
                    throw new Error('Failed to update topup - no rows affected');
                }
                
                const updatedTopup = updateResult.rows[0];
                console.log('Topup updated successfully:', {
                    order_id: updatedTopup.order_id,
                    new_status: updatedTopup.status,
                    payment_type: updatedTopup.payment_type
                });

                if (newStatus === 'success') {
                    console.log('Processing successful payment - updating user balance');
                    console.log('User ID:', topup.user_id, 'Type:', typeof topup.user_id);
                    console.log('Amount to add:', topup.amount, 'Type:', typeof topup.amount);
                    
                    const balanceQuery = `
                        UPDATE users 
                        SET balance = balance + $1,
                            updated_at = NOW()
                        WHERE user_id = $2
                        RETURNING user_id, balance
                    `;
                    
                    console.log('Executing balance update with params:', [topup.amount, topup.user_id]);
                    const balanceResult = await client.query(balanceQuery, [
                        parseFloat(topup.amount),
                        parseInt(topup.user_id)
                    ]);
                    
                    if (balanceResult.rows.length === 0) {
                        throw new Error(`User not found: ${topup.user_id}`);
                    }
                    
                    const user = balanceResult.rows[0];
                    console.log('User balance updated successfully:', {
                        userId: user.user_id,
                        newBalance: user.balance,
                        addedAmount: topup.amount,
                    });
                }

                await client.query('COMMIT');
                console.log('Transaction committed successfully');

                setImmediate(() => {
                    this.notifyPHPService({
                        order_id: orderId,
                        status: newStatus,
                        user_id: topup.user_id,
                        amount: topup.amount,
                        payment_type: paymentType,
                        transaction_id: transactionId || '',
                        transaction_time: transactionTime || '',
                    }).catch(err => {
                        console.error('PHP notification failed (async):', err.message);
                    });
                });

                console.log('=== Payment Processed Successfully ===');

                return res.status(200).json({
                    status: 'ok',
                    message: 'Payment processed successfully',
                    order_id: orderId,
                    new_status: newStatus,
                });
            } else {
                await client.query('COMMIT');
                console.log('No status change needed for:', orderId);
                return res.status(200).json({
                    status: 'ok',
                    message: 'No status change',
                    order_id: orderId,
                    current_status: topup.status,
                });
            }

        } catch (error) {
            console.error('=== Payment Webhook Error ===');
            console.error('Error Type:', error.name);
            console.error('Error Message:', error.message);
            console.error('Stack Trace:', error.stack);

            if (client) {
                try {
                    await client.query('ROLLBACK');
                    console.log('Transaction rolled back');
                } catch (rollbackError) {
                    console.error('Rollback error:', rollbackError.message);
                }
            }

            return res.status(500).json({
                status: 'error',
                message: 'Internal Server Error',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });

        } finally {
            if (client) {
                client.release();
                console.log('Database client released');
            }
        }
    }

    async healthCheck(req, res) {
        try {
            const { rows } = await pool.query('SELECT NOW()');
            
            return res.status(200).json({
                status: 'ok',
                service: 'Payment Controller',
                timestamp: new Date().toISOString(),
                database: 'connected',
                db_time: rows[0].now,
            });
        } catch (error) {
            console.error('Health check failed:', error.message);
            return res.status(503).json({
                status: 'error',
                service: 'Payment Controller',
                timestamp: new Date().toISOString(),
                database: 'disconnected',
                error: error.message,
            });
        }
    }

    async getPaymentStatus(req, res) {
        try {
            const { orderId } = req.params;

            const queryText = 'SELECT * FROM topups WHERE order_id = $1';
            const { rows } = await pool.query(queryText, [orderId]);

            if (rows.length === 0) {
                return res.status(404).json({
                    status: 'error',
                    message: 'Order not found',
                });
            }

            const topup = rows[0];

            return res.status(200).json({
                status: 'ok',
                data: {
                    order_id: topup.order_id,
                    user_id: topup.user_id,
                    amount: topup.amount,
                    status: topup.status,
                    payment_type: topup.payment_type,
                    created_at: topup.created_at,
                    updated_at: topup.updated_at,
                },
            });
        } catch (error) {
            console.error('Get payment status error:', error.message);
            return res.status(500).json({
                status: 'error',
                message: 'Internal Server Error',
            });
        }
    }

    async getMidtransSnapToken(orderId, amount) {
        try {
            return `SNAP-${orderId}-${Date.now()}`;
        } catch (error) {
            console.error('Failed to get Midtrans snap token:', error);
            throw new Error('Failed to generate payment token');
        }
    }

    async createTopup(req, res) {
        try {
            const userId = req.user.user_id;
            const { amount } = req.body;

            if (!amount || amount < 10000) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Minimum topup amount is 10000'
                });
            }

            const orderId = `ORDER-${userId}-${Date.now()}`;

            const queryText = `
                INSERT INTO topups (order_id, user_id, amount, status)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            const { rows } = await pool.query(queryText, [orderId, userId, amount, 'pending']);

            const snapToken = await this.getMidtransSnapToken(orderId, amount);

            return res.status(201).json({
                status: 'ok',
                data: {
                    order_id: orderId,
                    snap_token: snapToken,
                    amount: amount
                }
            });
        } catch (error) {
            console.error('Create topup error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Internal Server Error'
            });
        }
    }

    async getUserTopups(req, res) {
        try {
            const userId = req.user.user_id;
            
            const queryText = `
                SELECT * FROM topups 
                WHERE user_id = $1 
                ORDER BY created_at DESC
            `;
            const { rows } = await pool.query(queryText, [userId]);

            return res.status(200).json({
                status: 'ok',
                data: rows
            });
        } catch (error) {
            console.error('Get user topups error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Internal Server Error'
            });
        }
    }
}

module.exports = new PaymentController();