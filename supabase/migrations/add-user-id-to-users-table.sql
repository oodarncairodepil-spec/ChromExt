-- Add user_id column to users table to establish relationship with shop owners
-- This will allow proper data isolation between different shop owners' customers

-- Add user_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);

-- Update RLS policies for users table to use user_id filtering
DROP POLICY IF EXISTS "Allow all operations on users" ON users;

-- Create new RLS policies using user_id filtering
CREATE POLICY "users_select_owner" ON users
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "users_insert_owner" ON users
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_update_owner" ON users
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_delete_owner" ON users
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Add trigger to automatically set user_id when inserting new users
-- This ensures user_id is always set to the authenticated user

CREATE OR REPLACE FUNCTION set_users_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set user_id to the authenticated user if not already set
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_users_user_id ON users;
CREATE TRIGGER trigger_set_users_user_id
    BEFORE INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_users_user_id();

-- Verify the changes
SELECT 'users' as table_name, 
       COUNT(*) as total_records,
       COUNT(user_id) as records_with_user_id
FROM users;

-- Show table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;