-- Migration: Add performance indexes for product search

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a GIN index on product_name for fast trigram-based text search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_trgm ON products USING gin (product_name gin_trgm_ops);

-- Create a standard B-tree index on price for efficient range queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_price ON products (price);
