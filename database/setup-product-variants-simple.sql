-- Simple setup for product_variants and variant_options tables
-- This version focuses on table creation without complex functions/triggers

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_tier_1 VARCHAR(100),
    variant_tier_2 VARCHAR(100),
    variant_tier_3 VARCHAR(100),
    sku_suffix VARCHAR(50),
    price DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    weight DECIMAL(8,2),
    image TEXT,
    is_active BOOLEAN DEFAULT true,
    full_product_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Drop and recreate variant_options table to ensure correct schema
DROP TABLE IF EXISTS variant_options CASCADE;

-- Create variant_options table
CREATE TABLE variant_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    tier INTEGER NOT NULL CHECK (tier IN (1, 2, 3)),
    option_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku_suffix ON product_variants(sku_suffix);
CREATE INDEX IF NOT EXISTS idx_variant_options_product_id ON variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_options_tier ON variant_options(tier);

-- Enable RLS
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_variants
CREATE POLICY "Users can view their own product variants" ON product_variants
    FOR SELECT USING (
        product_id IN (
            SELECT id FROM products WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own product variants" ON product_variants
    FOR INSERT WITH CHECK (
        product_id IN (
            SELECT id FROM products WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own product variants" ON product_variants
    FOR UPDATE USING (
        product_id IN (
            SELECT id FROM products WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own product variants" ON product_variants
    FOR DELETE USING (
        product_id IN (
            SELECT id FROM products WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for variant_options
CREATE POLICY "Users can view their own variant options" ON variant_options
    FOR SELECT USING (
        product_id IN (
            SELECT id FROM products WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own variant options" ON variant_options
    FOR INSERT WITH CHECK (
        product_id IN (
            SELECT id FROM products WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own variant options" ON variant_options
    FOR UPDATE USING (
        product_id IN (
            SELECT id FROM products WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own variant options" ON variant_options
    FOR DELETE USING (
        product_id IN (
            SELECT id FROM products WHERE user_id = auth.uid()
        )
    );