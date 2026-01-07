-- Create staff_accounts table
CREATE TABLE IF NOT EXISTS staff_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_user_id),
  UNIQUE(owner_id, email)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_accounts_owner_id ON staff_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_staff_user_id ON staff_accounts(staff_user_id);

-- Enable RLS
ALTER TABLE staff_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can view their staff" ON staff_accounts
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Owners can create staff" ON staff_accounts
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their staff" ON staff_accounts
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their staff" ON staff_accounts
  FOR DELETE USING (owner_id = auth.uid());

CREATE POLICY "Staff can view their own account" ON staff_accounts
  FOR SELECT USING (staff_user_id = auth.uid());

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_staff_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_accounts_updated_at
  BEFORE UPDATE ON staff_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_accounts_updated_at();

