-- Safely add partial payment column to orders table without dropping data
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS partial_payment JSONB;

-- Optional: verify column presence
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'orders' AND column_name = 'partial_payment';