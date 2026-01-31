-- Seller users
INSERT INTO users (email, password, role, name, address, balance)
VALUES
('seller3@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'SELLER', 'Seller One', 'Jakarta', 1000000),
('seller4@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'SELLER', 'Seller Two', 'Bandung', 2000000)
ON CONFLICT (email) DO NOTHING;

-- Buyer users
INSERT INTO users (email, password, role, name, address, balance)
VALUES
('buyer9@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Solo', 450000),
('buyer10@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Bekasi', 150000),
('buyer11@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer One', 'Surabaya', 500000),
('buyer12@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Yogyakarta', 750000),
('buyer13@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Kebumen', 300000),
('buyer14@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Solo', 450000),
('buyer15@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Bekasi', 150000),
('buyer16@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer One', 'Surabaya', 500000),
('buyer17@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Yogyakarta', 750000),
('buyer18@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Kebumen', 300000),
('buyer19@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Solo', 450000),
('buyer20@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Bekasi', 150000),
('buyer21@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer One', 'Surabaya', 500000),
('buyer22@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Yogyakarta', 750000),
('buyer23@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Kebumen', 300000),
('buyer24@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Solo', 450000),
('buyer25@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Bekasi', 150000),
('buyer26@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer One', 'Surabaya', 500000),
('buyer27@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Yogyakarta', 750000),
('buyer28@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Kebumen', 300000),
('buyer29@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Solo', 450000),
('buyer30@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Bekasi', 150000),
('buyer31@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer One', 'Surabaya', 500000),
('buyer32@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Yogyakarta', 750000),
('buyer33@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Kebumen', 300000),
('buyer34@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Solo', 450000),
('buyerfufufafa@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Bekasi', 150000),
('buyerzigzag@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer One', 'Surabaya', 500000),
('buyershambalamba@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Yogyakarta', 750000),
('buyer38@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Kebumen', 300000),
('buyer39@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Solo', 450000),
('buyer40@nimonspedia.com', '$2a$10$8u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x6y6z6A6B6u6n6y6v6w6x', 'BUYER', 'Buyer Two', 'Bekasi', 150000)
ON CONFLICT (email) DO NOTHING;