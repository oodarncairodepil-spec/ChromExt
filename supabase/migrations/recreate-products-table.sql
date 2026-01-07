-- Complete recreation of products table to ensure all columns exist
-- This will drop the existing table and recreate it with all required columns

-- WARNING: This will delete all existing product data!
-- Make sure to backup your data first if needed

-- Drop existing table and recreate from scratch
DROP TABLE IF EXISTS products CASCADE;

-- Create products table with all required columns
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL DEFAULT 'Unnamed Product',
  description TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  stock INTEGER DEFAULT 0,
  is_digital BOOLEAN DEFAULT false,
  weight DECIMAL(8,3), -- in kg, allows up to 99999.999 kg
  sku VARCHAR(100) UNIQUE,
  status VARCHAR(20) DEFAULT 'active',
  image TEXT, -- URL of the product image
  has_variants BOOLEAN DEFAULT false, -- indicates if product has variants
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create all necessary indexes
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_has_variants ON products(has_variants);
CREATE INDEX idx_products_created_at ON products(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
CREATE POLICY "Users can view all products" ON products
FOR SELECT USING (true);

CREATE POLICY "Users can manage their own products" ON products
FOR ALL USING (user_id = auth.uid());

-- Create or replace the update trigger function
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- Instructions:
-- 1. BACKUP your existing products data if needed
-- 2. Go to your Supabase project dashboard
-- 3. Navigate to SQL Editor
-- 4. Run this SQL command to recreate the products table
-- 5. After this, run setup-product-variants.sql successfully