-- Add user_id columns to variant_options and product_variants tables
-- This will make filtering by authenticated user much easier and more secure

-- Add user_id column to variant_options table
ALTER TABLE variant_options 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to product_variants table
ALTER TABLE product_variants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing records to set user_id based on the product's user_id
UPDATE variant_options 
SET user_id = products.user_id 
FROM products 
WHERE variant_options.product_id = products.id 
AND variant_options.user_id IS NULL;

UPDATE product_variants 
SET user_id = products.user_id 
FROM products 
WHERE product_variants.product_id = products.id 
AND product_variants.user_id IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_variant_options_user_id ON variant_options(user_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_user_id ON product_variants(user_id);

-- Update RLS policies for variant_options to use user_id directly
DROP POLICY IF EXISTS "variant_options_select_owner" ON variant_options;
DROP POLICY IF EXISTS "variant_options_insert_owner" ON variant_options;
DROP POLICY IF EXISTS "variant_options_update_owner" ON variant_options;
DROP POLICY IF EXISTS "variant_options_delete_owner" ON variant_options;

-- Create new RLS policies using direct user_id filtering
CREATE POLICY "variant_options_select_owner" ON variant_options
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "variant_options_insert_owner" ON variant_options
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "variant_options_update_owner" ON variant_options
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "variant_options_delete_owner" ON variant_options
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Update RLS policies for product_variants to use user_id directly
DROP POLICY IF EXISTS "product_variants_select_owner" ON product_variants;
DROP POLICY IF EXISTS "product_variants_insert_owner" ON product_variants;
DROP POLICY IF EXISTS "product_variants_update_owner" ON product_variants;
DROP POLICY IF EXISTS "product_variants_delete_owner" ON product_variants;

-- Create new RLS policies using direct user_id filtering
CREATE POLICY "product_variants_select_owner" ON product_variants
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "product_variants_insert_owner" ON product_variants
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "product_variants_update_owner" ON product_variants
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "product_variants_delete_owner" ON product_variants
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Add triggers to automatically set user_id when inserting new records
-- This ensures user_id is always set correctly for new records

CREATE OR REPLACE FUNCTION set_variant_options_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set user_id from the related product if not already set
    IF NEW.user_id IS NULL THEN
        SELECT products.user_id INTO NEW.user_id
        FROM products
        WHERE products.id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_product_variants_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set user_id from the related product if not already set
    IF NEW.user_id IS NULL THEN
        SELECT products.user_id INTO NEW.user_id
        FROM products
        WHERE products.id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_set_variant_options_user_id ON variant_options;
CREATE TRIGGER trigger_set_variant_options_user_id
    BEFORE INSERT ON variant_options
    FOR EACH ROW
    EXECUTE FUNCTION set_variant_options_user_id();

DROP TRIGGER IF EXISTS trigger_set_product_variants_user_id ON product_variants;
CREATE TRIGGER trigger_set_product_variants_user_id
    BEFORE INSERT ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION set_product_variants_user_id();

-- Verify the changes
SELECT 'variant_options' as table_name, 
       COUNT(*) as total_records,
       COUNT(user_id) as records_with_user_id
FROM variant_options
UNION ALL
SELECT 'product_variants' as table_name,
       COUNT(*) as total_records, 
       COUNT(user_id) as records_with_user_id
FROM product_variants;