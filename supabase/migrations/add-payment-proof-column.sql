-- Add payment_proof column to orders table
-- This will store the URL/path to the uploaded payment proof image

ALTER TABLE orders 
ADD COLUMN payment_proof TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN orders.payment_proof IS 'URL or path to the uploaded payment proof image';

-- Optional: Add an index for better query performance if needed
-- CREATE INDEX idx_orders_payment_proof ON orders(payment_proof) WHERE payment_proof IS NOT NULL;