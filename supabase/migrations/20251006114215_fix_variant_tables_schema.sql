-- Drop existing tables if they exist
DROP TABLE IF EXISTS variant_options CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;

-- Create product_variants table with correct schema
CREATE TABLE product_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Variant tier values
  variant_tier_1_value VARCHAR(255),
  variant_tier_2_value VARCHAR(255),
  variant_tier_3_value VARCHAR(255),
  
  -- Full product name (e.g., "Timnas 2025 Jersey Supporter Red Home Long Sleeve")
  full_product_name VARCHAR(500) NOT NULL,
  
  -- Variant-specific properties
  image_url TEXT,
  weight DECIMAL(8,3),
  price DECIMAL(10,2) NOT NULL,
  stock INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sku_suffix VARCHAR(100), -- e.g., "RED-HOME-LS"
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create variant_options table with correct schema
CREATE TABLE variant_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  
  -- Tier information
  tier_level INTEGER NOT NULL CHECK (tier_level IN (1, 2, 3)),
  tier_name VARCHAR(100) NOT NULL, -- e.g., "Color", "Type", "Sleeve"
  
  -- Option information
  option_value VARCHAR(255) NOT NULL, -- e.g., "Red", "Home", "Long Sleeve"
  option_display_name VARCHAR(255), -- Optional display name
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique combinations
  UNIQUE(product_id, tier_level, option_value)
);

-- Create indexes for better performance
CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_active ON product_variants(is_active);
CREATE INDEX idx_variant_options_product_id ON variant_options(product_id);
CREATE INDEX idx_variant_options_tier_level ON variant_options(tier_level);

-- Enable RLS (Row Level Security)
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Enable read access for all users" ON product_variants FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON product_variants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON product_variants FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON product_variants FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable read access for all users" ON variant_options FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users only" ON variant_options FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users only" ON variant_options FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users only" ON variant_options FOR DELETE USING (auth.role() = 'authenticated');