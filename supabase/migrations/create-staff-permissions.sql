-- Create staff_permissions table with boolean flags
CREATE TABLE IF NOT EXISTS staff_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_account_id UUID NOT NULL REFERENCES staff_accounts(id) ON DELETE CASCADE,
  
  -- Page access permissions
  can_view_products BOOLEAN DEFAULT false,
  can_edit_products BOOLEAN DEFAULT false,
  can_create_products BOOLEAN DEFAULT false,
  can_delete_products BOOLEAN DEFAULT false,
  can_view_product_variants BOOLEAN DEFAULT false,
  can_edit_product_variants BOOLEAN DEFAULT false,
  can_bulk_create_products BOOLEAN DEFAULT false,
  
  can_view_orders BOOLEAN DEFAULT false,
  can_view_all_orders BOOLEAN DEFAULT false, -- If false, only own orders
  can_edit_orders BOOLEAN DEFAULT false,
  can_create_orders BOOLEAN DEFAULT false, -- Through cart
  
  can_view_templates BOOLEAN DEFAULT false,
  can_edit_templates BOOLEAN DEFAULT false,
  can_create_templates BOOLEAN DEFAULT false,
  can_delete_templates BOOLEAN DEFAULT false,
  can_send_templates BOOLEAN DEFAULT false,
  
  can_view_cart BOOLEAN DEFAULT false,
  can_use_cart BOOLEAN DEFAULT false,
  
  can_view_users BOOLEAN DEFAULT false,
  can_edit_users BOOLEAN DEFAULT false,
  
  can_access_profile BOOLEAN DEFAULT false,
  can_access_payment_methods BOOLEAN DEFAULT false,
  can_access_shipping_courier BOOLEAN DEFAULT false,
  can_access_integration BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(staff_account_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_staff_permissions_staff_account_id ON staff_permissions(staff_account_id);

-- Enable RLS
ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can view staff permissions" ON staff_permissions
  FOR SELECT USING (
    staff_account_id IN (
      SELECT id FROM staff_accounts WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage staff permissions" ON staff_permissions
  FOR ALL USING (
    staff_account_id IN (
      SELECT id FROM staff_accounts WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can view their own permissions" ON staff_permissions
  FOR SELECT USING (
    staff_account_id IN (
      SELECT id FROM staff_accounts WHERE staff_user_id = auth.uid()
    )
  );

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_staff_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_permissions_updated_at
  BEFORE UPDATE ON staff_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_permissions_updated_at();

