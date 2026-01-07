-- Add created_by field to orders table to track which staff member created each order
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);

-- Update RLS policies to allow staff to see their own orders
-- Note: This assumes existing RLS policies check seller_id
-- Staff should be able to see orders where created_by = their user_id OR seller_id = their owner_id

