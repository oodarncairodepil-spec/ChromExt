-- Add shipping_fee column to orders table
-- This script adds a numeric column to store custom shipping fees entered by sellers

ALTER TABLE orders 
ADD COLUMN shipping_fee DECIMAL(10,2) DEFAULT 0;

-- Add comment to document the column purpose
COMMENT ON COLUMN orders.shipping_fee IS 'Custom shipping fee entered by seller (in addition to courier service cost)';

-- Verify the column was added successfully
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'shipping_fee';