const chatService = require('../services/chatService');
const { sendNotification } = require('../services/pushService');
const db = require('../config/database');

function chatSocket(io, socket) {
    const { userId, role, userName } = socket.data;

    function getRoomName(store_id, buyer_id) {
        return `chat_${store_id}_${buyer_id}`;
    }

    // JOIN ROOM
    socket.on('join_room', async (data) => {
        try {
            const { store_id, buyer_id } = data || {};
            if (!store_id || !buyer_id) {
                return socket.emit('chat_error', { message: 'store_id and buyer_id are required' });
            }

            const canJoin = await chatService.canUserJoinRoom(
                userId,
                role,
                store_id,
                buyer_id
            );

            if (!canJoin) {
                return socket.emit('chat_error', {
                    message: 'You are not allowed to join this room',
                });
            }

            const room = await chatService.getOrCreateRoom(store_id, buyer_id);
            const messages = await chatService.getRecentMessages(store_id, buyer_id, 50);

            const roomName = getRoomName(store_id, buyer_id);
            socket.join(roomName);

            socket.emit('chat_state', {
                room,
                messages,
            });

            console.log(`User ${userId} joined chat room: ${roomName}`);

            // tandai semua pesan sebagai read ketika room dibuka
            try {
                await chatService.markMessagesAsRead(store_id, buyer_id, userId);

                // Broadcast to other users in room that messages were read
                socket.to(roomName).emit('messages_read_update', {
                    store_id,
                    buyer_id,
                    reader_id: userId,
                });
            } catch (err) {
                console.error('markMessagesAsRead error:', err);
            }

        } catch (error) {
            console.error('join_room error:', error);
            socket.emit('chat_error', { message: 'Failed to join chat room' });
        }
    });

    // SEND MESSAGE
    socket.on('send_message', async (data) => {
        try {
            const {
                store_id,
                buyer_id,
                message_type,
                content,
                product_id = null,
            } = data || {};

            if (!store_id || !buyer_id || !message_type || !content) {
                return socket.emit('chat_error', {
                    message: 'store_id, buyer_id, message_type, and content are required',
                });
            }

            const allowedTypes = ['text', 'image', 'item_preview'];
            if (!allowedTypes.includes(message_type)) {
                return socket.emit('chat_error', {
                    message: 'Invalid message_type',
                });
            }

            const canJoin = await chatService.canUserJoinRoom(
                userId,
                role,
                store_id,
                buyer_id
            );

            if (!canJoin) {
                return socket.emit('chat_error', {
                    message: 'Not allowed to send message in this room',
                });
            }

            const savedMessage = await chatService.createMessage({
                store_id,
                buyer_id,
                sender_id: userId,
                message_type: message_type || 'text',
                content: content || '',
                product_id: product_id || null,
            });

            const roomName = getRoomName(store_id, buyer_id);

            // kirim pesan ke SEMUA client di room
            io.to(roomName).emit('message_new', savedMessage);

            // beri tahu PENGIRIM bahwa pesan sudah delivered
            socket.emit('message_delivered', {
                message_id: savedMessage.message_id,
            });

            // Send push notification to the recipient
            try {
                const storeResult = await db.query('SELECT user_id, store_name FROM stores WHERE store_id = $1', [store_id]);
                const sellerId = storeResult.rows[0]?.user_id;
                const storeName = storeResult.rows[0]?.store_name;

                const buyerResult = await db.query('SELECT name FROM users WHERE user_id = $1', [buyer_id]);
                const buyerName = buyerResult.rows[0]?.name;

                let recipientId;
                let notificationPayload;

                if (userId === buyer_id) { // Sender is buyer, recipient is seller
                    recipientId = sellerId;
                    notificationPayload = {
                        title: `New message from ${buyerName || 'a buyer'}`,
                        body: savedMessage.content.length > 100 ? savedMessage.content.substring(0, 97) + '...' : savedMessage.content,
                        url: `/app/chat` // Seller goes to the general chat page
                    };
                } else { // Sender is seller, recipient is buyer
                    recipientId = buyer_id;
                    notificationPayload = {
                        title: `New message from ${storeName || 'a seller'}`,
                        body: savedMessage.content.length > 100 ? savedMessage.content.substring(0, 97) + '...' : savedMessage.content,
                        url: `/app/chat?store_id=${store_id}`
                    };
                }
                
                if (recipientId) {
                    // Check if recipient has chat notifications enabled
                    const prefs = await db.query('SELECT chat_enabled FROM push_preferences WHERE user_id = $1', [recipientId]);
                    const chatEnabled = prefs.rows[0]?.chat_enabled;

                    if (chatEnabled) {
                        // Check if recipient is currently online in the room
                        const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
                        let isRecipientOnline = false;
                        if (socketsInRoom) {
                            for (const socketId of socketsInRoom) {
                                const socketUser = io.sockets.sockets.get(socketId)?.data;
                                if (socketUser?.userId === recipientId) {
                                    isRecipientOnline = true;
                                    break;
                                }
                            }
                        }
                        
                                            if (!isRecipientOnline) {
                                                 sendNotification(recipientId, notificationPayload, 'chat');
                                            }                    }
                }
            } catch (pushError) {
                console.error('Failed to send push notification:', pushError);
            }

            console.log(
                `Socket message saved & broadcasted: ${roomName}`,
                savedMessage.message_id
            );
        } catch (error) {
            console.error('send_message error:', error);
            socket.emit('chat_error', { message: 'Failed to send message' });
        }
    });

    // LOAD OLDER MESSAGES (infinite scroll)
    socket.on('load_older_messages', async (data) => {
        try {
            const { store_id, buyer_id, before } = data || {};
            if (!store_id || !buyer_id || !before) return;

            // keamanan: cek boleh akses room
            const canJoin = await chatService.canUserJoinRoom(
                userId,
                role,
                store_id,
                buyer_id
            );

            if (!canJoin) {
                return socket.emit('chat_error', {
                    message: 'Not allowed to load messages in this room',
                });
            }

            // before = message_id paling tua di UI
            const older = await chatService.getOlderMessages(
                store_id,
                buyer_id,
                before,
                50
            );

            // kirim balik ke client
            socket.emit('older_messages', {
                store_id,
                buyer_id,
                messages: older,
            });
        } catch (err) {
            console.error('load_older_messages error:', err);
        }
    });

    // TYPING
    socket.on('typing', async (data) => {
        try {
            const { store_id, buyer_id, is_typing } = data || {};
            if (!store_id || !buyer_id) return;

            const roomName = getRoomName(store_id, buyer_id);

            // Determine display name based on role
            let displayName = userName || 'Pengguna';
            
            if (role === 'SELLER') {
                try {
                    const storeResult = await chatService.getStoreName(store_id);
                    displayName = storeResult || displayName;
                } catch (err) {
                    console.error('Failed to get store name:', err);
                }
            } else if (role === 'BUYER') {
                displayName = userName || 'Pembeli';
            }

            socket.to(roomName).emit('typing', {
                store_id,
                buyer_id,
                user_id: userId,
                user_name: displayName,
                is_typing: !!is_typing,
            });
        } catch (error) {
            console.error('typing event error:', error);
        }
    });
}

module.exports = chatSocket;