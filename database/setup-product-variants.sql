-- Create product_variants table to store individual variant combinations
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Variant tier values (what specific options are selected for this variant)
  variant_tier_1_value VARCHAR(255), -- e.g., "red", "blue", "white"
  variant_tier_2_value VARCHAR(255), -- e.g., "home", "away"
  variant_tier_3_value VARCHAR(255), -- e.g., "long sleeve", "short sleeve"
  
  -- Generated full product name combining base product + all variant values
  full_product_name VARCHAR(500) NOT NULL, -- e.g., "Timnas 2025 Jersey Supporter Red Home Long Sleeve"
  
  -- Individual variant properties
  image_url TEXT,
  weight DECIMAL(8,3), -- in kg, allows up to 99999.999 kg
  price DECIMAL(10,2) NOT NULL, -- variant-specific price
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sku VARCHAR(100) UNIQUE, -- variant-specific SKU
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create variant_options table to store available options for each variant tier
CREATE TABLE IF NOT EXISTS variant_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Tier information
  tier_level INTEGER NOT NULL CHECK (tier_level IN (1, 2, 3)), -- 1, 2, or 3
  tier_name VARCHAR(100) NOT NULL, -- e.g., "Color", "Type", "Sleeve"
  
  -- Option details
  option_value VARCHAR(255) NOT NULL, -- e.g., "red", "home", "long sleeve"
  option_display_name VARCHAR(255), -- Optional: for display purposes if different from value
  sort_order INTEGER DEFAULT 0, -- For ordering options within a tier
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combinations
  UNIQUE(product_id, tier_level, option_value)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_product_variants_stock ON product_variants(stock);

CREATE INDEX IF NOT EXISTS idx_variant_options_product_id ON variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_options_tier ON variant_options(product_id, tier_level);

-- Enable RLS (Row Level Security)
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;

-- Create policies for product_variants
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

-- Create policies for variant_options
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

-- Function to automatically update updated_at timestamp for product_variants
CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_product_variants_updated_at();

-- Function to generate full product name from base product name and variant values
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

-- Function to automatically generate full_product_name when inserting/updating variants
CREATE OR REPLACE FUNCTION auto_generate_full_product_name()
RETURNS TRIGGER AS $$
DECLARE
  base_name VARCHAR(255);
BEGIN
  -- Get the base product name
  SELECT name INTO base_name FROM products WHERE id = NEW.product_id;
  
  -- Generate the full product name
  NEW.full_product_name := generate_full_product_name(
    base_name,
    NEW.variant_tier_1_value,
    NEW.variant_tier_2_value,
    NEW.variant_tier_3_value
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate full product names
DROP TRIGGER IF EXISTS auto_generate_full_product_name_trigger ON product_variants;
CREATE TRIGGER auto_generate_full_product_name_trigger
  BEFORE INSERT OR UPDATE ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_full_product_name();

-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run this SQL command to create the product variants tables
-- 4. This will enable the tiered product variant system with automatic name generation