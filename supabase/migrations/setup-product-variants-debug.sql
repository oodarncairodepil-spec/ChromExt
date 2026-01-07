-- Debug version of setup-product-variants.sql with better error handling
-- This version will help identify exactly where the 'column sku does not exist' error occurs

-- First, let's test if we can access the products table
DO $$
BEGIN
    -- Test products table access
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products' AND table_schema = 'public') THEN
        RAISE NOTICE 'Products table exists';
    ELSE
        RAISE EXCEPTION 'Products table does not exist';
    END IF;
    
    -- Test if name column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'name' AND table_schema = 'public') THEN
        RAISE NOTICE 'Products.name column exists';
    ELSE
        RAISE EXCEPTION 'Products.name column does not exist';
    END IF;
    
    -- Test if sku column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sku' AND table_schema = 'public') THEN
        RAISE NOTICE 'Products.sku column exists';
    ELSE
        RAISE EXCEPTION 'Products.sku column does not exist';
    END IF;
END $$;

-- Create product_variants table (same as original)
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Variant tier values
  variant_tier_1_value VARCHAR(255),
  variant_tier_2_value VARCHAR(255),
  variant_tier_3_value VARCHAR(255),
  
  -- Generated full product name
  full_product_name VARCHAR(500) NOT NULL,
  
  -- Individual variant properties
  image_url TEXT,
  weight DECIMAL(8,3),
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sku VARCHAR(100) UNIQUE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create variant_options table (same as original)
CREATE TABLE IF NOT EXISTS variant_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  tier_level INTEGER NOT NULL CHECK (tier_level IN (1, 2, 3)),
  tier_name VARCHAR(100) NOT NULL,
  
  option_value VARCHAR(255) NOT NULL,
  option_display_name VARCHAR(255),
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(product_id, tier_level, option_value)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_product_variants_stock ON product_variants(stock);
CREATE INDEX IF NOT EXISTS idx_variant_options_product_id ON variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_options_tier ON variant_options(product_id, tier_level);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;

-- Create policies (same as original)
CREATE POLICY "Users can view product variants" ON product_variants
FOR SELECT USING (true);

CREATE POLICY "Users can manage their own product variants" ON product_variants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_variants.product_id 
    AND products.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view variant options" ON variant_options
FOR SELECT USING (true);

CREATE POLICY "Users can manage their own variant options" ON variant_options
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = variant_options.product_id 
    AND products.user_id = auth.uid()
  )
);

-- Function with better error handling
CREATE OR REPLACE FUNCTION generate_full_product_name(
  base_product_name VARCHAR(255),
  tier1_value VARCHAR(255) DEFAULT NULL,
  tier2_value VARCHAR(255) DEFAULT NULL,
  tier3_value VARCHAR(255) DEFAULT NULL
)
RETURNS VARCHAR(500) AS $$
BEGIN
  RETURN TRIM(
    base_product_name || 
    CASE WHEN tier1_value IS NOT NULL THEN ' ' || tier1_value ELSE '' END ||
    CASE WHEN tier2_value IS NOT NULL THEN ' ' || tier2_value ELSE '' END ||
    CASE WHEN tier3_value IS NOT NULL THEN ' ' || tier3_value ELSE '' END
  );
END;
$$ LANGUAGE plpgsql;

-- Modified trigger function with better error handling
CREATE OR REPLACE FUNCTION auto_generate_full_product_name()
RETURNS TRIGGER AS $$
DECLARE
  base_name VARCHAR(255);
BEGIN
  -- Debug: Log the product_id we're trying to look up
  RAISE NOTICE 'Looking up product with id: %', NEW.product_id;
  
  -- Get the base product name with explicit column reference
  SELECT p.name INTO base_name 
  FROM products p 
  WHERE p.id = NEW.product_id;
  
  -- Check if we found the product
  IF base_name IS NULL THEN
    RAISE EXCEPTION 'Product with id % not found', NEW.product_id;
  END IF;
  
  -- Debug: Log the base name we found
  RAISE NOTICE 'Found product name: %', base_name;
  
  -- Generate the full product name
  NEW.full_product_name := generate_full_product_name(
    base_name,
    NEW.variant_tier_1_value,
    NEW.variant_tier_2_value,
    NEW.variant_tier_3_value
  );
  
  -- Debug: Log the generated name
  RAISE NOTICE 'Generated full product name: %', NEW.full_product_name;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in auto_generate_full_product_name: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Update trigger function
CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_updated_at();

DROP TRIGGER IF EXISTS auto_generate_full_product_name_trigger ON product_variants;
CREATE TRIGGER auto_generate_full_product_name_trigger
  BEFORE INSERT OR UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_full_product_name();

-- Final test
DO $$
BEGIN
    RAISE NOTICE 'Setup completed successfully. All tables, functions, and triggers created.';
END $$;