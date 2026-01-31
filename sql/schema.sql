-- Enable pg_trgm extension for trigram search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role TEXT CHECK (role IN ('BUYER', 'SELLER', 'ADMIN')) NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    balance BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT check_balance_positive CHECK (balance >= 0)
);

-- Create trigram indexes for fast fuzzy search
CREATE INDEX idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
CREATE INDEX idx_users_email_trgm ON users USING gin (email gin_trgm_ops);

CREATE TABLE stores (
    store_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    store_name VARCHAR(150) UNIQUE NOT NULL,
    store_description TEXT,
    store_logo_path TEXT,
    balance BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    store_id INT NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    product_name VARCHAR(200) NOT NULL,
    description TEXT,
    price BIGINT NOT NULL,
    stock INT DEFAULT 0,
    main_image_path TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm ON products USING gin (product_name gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price ON products (price);

CREATE TABLE cart_items (
    cart_item_id SERIAL PRIMARY KEY,
    buyer_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    quantity INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (buyer_id, product_id)
);

CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE category_item (
    category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, product_id)
);

CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    buyer_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    store_id INT REFERENCES stores(store_id) ON DELETE SET NULL,
    total_price BIGINT NOT NULL,
    shipping_address TEXT NOT NULL,
    status TEXT CHECK (status IN ('waiting_approval','approved','rejected','on_delivery','received'))
        DEFAULT 'waiting_approval' NOT NULL,
    reject_reason TEXT DEFAULT NULL,
    confirmed_at TIMESTAMP DEFAULT NULL,
    delivery_time TIMESTAMP DEFAULT NULL,
    received_at TIMESTAMP DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id INT REFERENCES products(product_id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    price_at_order BIGINT NOT NULL,
    subtotal BIGINT NOT NULL
);

-- seed categorie
INSERT INTO categories (name) VALUES
('Amazon Fashion'),
('Appliances'),
('Baby Fashion'),
('Backpacks'),
('Car Electronics'),
('Casual Shoes'),
('Clothing'),
('Conditioners'),
('Cycling'),
('Diet and Nutrition'),
('Dog Supplies'),
('Electronics'),
('Home and Kitchen'),
('Make-up'),
('Pet Supplies'),
('Shirts'),
('Shoes'),
('Sportswear'),
('Televisions'),
('Toys and Games');

-- Milestone 2: Auctions
CREATE TABLE auctions (
    auction_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    starting_price BIGINT NOT NULL,
    current_price BIGINT NOT NULL,
    min_increment BIGINT NOT NULL,
    quantity INT NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP DEFAULT NULL,
    status TEXT CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')) DEFAULT 'scheduled' NOT NULL,
    winner_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE auction_bids (
    bid_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL REFERENCES auctions(auction_id) ON DELETE CASCADE,
    bidder_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    bid_amount BIGINT NOT NULL,
    bid_time TIMESTAMP DEFAULT NOW()
);

-- Milestone 2: Chat Rooms
CREATE TABLE chat_rooms (
    store_id INT NOT NULL REFERENCES stores(store_id) ON DELETE CASCADE,
    buyer_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (store_id, buyer_id)
);

CREATE TABLE chat_messages (
    message_id SERIAL PRIMARY KEY,
    store_id INT NOT NULL,
    buyer_id INT NOT NULL,
    sender_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    message_type TEXT CHECK (message_type IN ('text', 'image', 'item_preview')) NOT NULL,
    content TEXT NOT NULL,
    product_id INT REFERENCES products(product_id) ON DELETE SET NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (store_id, buyer_id) REFERENCES chat_rooms(store_id, buyer_id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX idx_auction_bids_auction ON auction_bids(auction_id);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_chat_messages_room ON chat_messages(store_id, buyer_id);
CREATE INDEX idx_products_name ON products(product_name);

-- Milestone 2: Feature flags (global level)
CREATE TABLE feature_flags (
    flag_name VARCHAR(50) PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    disabled_reason TEXT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL
);

-- Milestone 2: User-level feature access
CREATE TABLE user_feature_access (
    access_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    flag_name VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    disabled_reason TEXT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE (user_id, flag_name)
);

CREATE INDEX idx_user_feature_access_user_id ON user_feature_access(user_id);

-- Milestone 2: Feature flag audit log
CREATE TABLE feature_flag_audit (
    audit_id SERIAL PRIMARY KEY,
    flag_name VARCHAR(50) NOT NULL,
    user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL, -- 'enable', 'disable'
    level VARCHAR(20) NOT NULL, -- 'global', 'user'
    reason TEXT,
    changed_by INT REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feature_flag_audit_flag_name ON feature_flag_audit(flag_name);
CREATE INDEX idx_feature_flag_audit_user_id ON feature_flag_audit(user_id);

-- Milestone 2: Push notification subscriptions
CREATE TABLE push_subscriptions (
    subscription_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh_key TEXT NOT NULL,
    auth_key TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Milestone 2: Push notification preferences
CREATE TABLE push_preferences (
    user_id INT PRIMARY KEY NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    chat_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    auction_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    order_enabled BOOLEAN DEFAULT TRUE NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed default feature flags
INSERT INTO feature_flags (flag_name, is_enabled) VALUES
('auction_enabled', TRUE),
('chat_enabled', TRUE),
('checkout_enabled', TRUE)
ON CONFLICT (flag_name) DO NOTHING;

INSERT INTO users (email, password, role, name, address, balance)
VALUES (
    'admin@nimonspedia.com',
    '$2a$10$1DQ9sksxteKnO3sTDryozeQ3XqOEbo8FgFV/7rb0KVgDOBJxxeifO', -- admin123
    'ADMIN',
    'Admin Nimonspedia',
    'Admin Office',
    0
)
ON CONFLICT (email) DO NOTHING;

ALTER TABLE products ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;

CREATE TABLE IF NOT EXISTS product_reviews (
    review_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_hidden BOOLEAN DEFAULT FALSE, -- Untuk fitur Moderasi Admin
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraint: Satu user hanya boleh review 1x per item di order yang sama
    UNIQUE(order_id, product_id),

    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_images ( image_id SERIAL PRIMARY KEY, review_id INT NOT NULL, image_path VARCHAR(255) NOT NULL, FOREIGN KEY (review_id) REFERENCES product_reviews(review_id) ON DELETE CASCADE);

CREATE TABLE IF NOT EXISTS review_replies (
    reply_id SERIAL PRIMARY KEY,
    review_id INT NOT NULL,
    user_id INT NOT NULL, -- ID User yang membalas (Bisa Seller atau Admin)
    reply_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (review_id) REFERENCES product_reviews(review_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topups (
    order_id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_type VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT topups_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_topups_updated_at
BEFORE UPDATE ON topups
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Fungsi Penghitung
CREATE OR REPLACE FUNCTION update_product_rating_stats() RETURNS TRIGGER AS $$
BEGIN
    UPDATE products
    SET
        -- Hitung rata-rata hanya dari review yang TIDAK disembunyikan (is_hidden = FALSE)
        average_rating = COALESCE((SELECT AVG(rating) FROM product_reviews WHERE product_id = NEW.product_id AND is_hidden = FALSE), 0),
        review_count = COALESCE((SELECT COUNT(*) FROM product_reviews WHERE product_id = NEW.product_id AND is_hidden = FALSE), 0)
    WHERE product_id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger ke Tabel Review
DROP TRIGGER IF EXISTS trg_update_rating ON product_reviews;

CREATE TRIGGER trg_update_rating
AFTER INSERT OR UPDATE OR DELETE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_rating_stats();
