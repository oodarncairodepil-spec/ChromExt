-- Add invoice_image column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS invoice_image TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN orders.invoice_image IS 'Base64 encoded PNG image of the order invoice';