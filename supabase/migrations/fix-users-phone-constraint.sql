-- Fix users table phone constraint to allow duplicate phones for different sellers
-- This allows buyers to register with different sellers using the same phone number

-- First, drop the existing unique constraint on phone
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;

-- Add a composite unique constraint on (phone, user_id)
-- This allows the same phone number to exist for different sellers
ALTER TABLE users ADD CONSTRAINT users_phone_user_id_unique UNIQUE (phone, user_id);

-- Update the index to match the new constraint
DROP INDEX IF EXISTS idx_users_phone;
CREATE INDEX IF NOT EXISTS idx_users_phone_user_id ON users(phone, user_id);

-- Verify the constraint change
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname LIKE '%phone%';

-- Show current table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Phone constraint updated successfully! Same phone can now be used by different sellers.' as status;