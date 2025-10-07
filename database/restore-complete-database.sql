-- COMPLETE DATABASE RESTORATION SCRIPT
-- This script restores ALL missing tables in the correct dependency order
-- Execute this in Supabase SQL Editor

-- =============================================================================
-- 1. USERS TABLE (Independent table)
-- =============================================================================

-- Create users table for buyers/customers
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  address TEXT,
  city VARCHAR(255),
  district VARCHAR(255),
  full_address TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN address IS NOT NULL AND city IS NOT NULL AND district IS NOT NULL 
      THEN address || ', ' || district || ', ' || city
      WHEN address IS NOT NULL AND city IS NOT NULL 
      THEN address || ', ' || city
      WHEN address IS NOT NULL 
      THEN address
      ELSE NULL
    END
  ) STORED,
  note TEXT,
  label VARCHAR(100),
  cart_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for users
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_city ON users(city);
CREATE INDEX IF NOT EXISTS idx_users_district ON users(district);

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true);

-- =============================================================================
-- 2. USER PROFILES TABLE (Depends on auth.users)
-- =============================================================================

-- Create user_profiles table for shop details and pickup locations
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name VARCHAR(255),
  phone_number VARCHAR(20),
  registered_email VARCHAR(255),
  shop_logo_url TEXT,
  pickup_province_id INTEGER,
  pickup_province_name VARCHAR(255),
  pickup_city_id INTEGER,
  pickup_city_name VARCHAR(255),
  pickup_district_id INTEGER,
  pickup_district_name VARCHAR(255),
  pickup_full_address TEXT,
  pickup_zip_code VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for user_profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Enable RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- 3. PAYMENT METHODS TABLE (Depends on auth.users)
-- =============================================================================

-- Create payment_methods table
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  bank_account_number VARCHAR(50) NOT NULL,
  bank_account_owner_name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for payment_methods
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON payment_methods(user_id);

-- Enable RLS for payment_methods
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payment_methods
DROP POLICY IF EXISTS "Users can view their own payment methods" ON payment_methods;
CREATE POLICY "Users can view their own payment methods" ON payment_methods
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payment methods" ON payment_methods;
CREATE POLICY "Users can insert their own payment methods" ON payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own payment methods" ON payment_methods;
CREATE POLICY "Users can update their own payment methods" ON payment_methods
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own payment methods" ON payment_methods;
CREATE POLICY "Users can delete their own payment methods" ON payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- 4. PRODUCTS TABLE (Depends on auth.users)
-- =============================================================================

-- Create products table with all required columns
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
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

-- Create indexes for products
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_has_variants ON products(has_variants);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

-- Enable RLS for products
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create policies for products
DROP POLICY IF EXISTS "Users can view all products" ON products;
CREATE POLICY "Users can view all products" ON products
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own products" ON products;
CREATE POLICY "Users can manage their own products" ON products
FOR ALL USING (user_id = auth.uid());

-- =============================================================================
-- 5. PRODUCT VARIANTS TABLE (Depends on products)
-- =============================================================================

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
  sku_suffix VARCHAR(50), -- suffix for SKU generation
  
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

-- Create indexes for product variants
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_active ON product_variants(is_active);
CREATE INDEX IF NOT EXISTS idx_product_variants_stock ON product_variants(stock);

CREATE INDEX IF NOT EXISTS idx_variant_options_product_id ON variant_options(product_id);
CREATE INDEX IF NOT EXISTS idx_variant_options_tier_level ON variant_options(tier_level);

-- Enable RLS for product variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE variant_options ENABLE ROW LEVEL SECURITY;

-- Create policies for product variants
DROP POLICY IF EXISTS "Users can view all product variants" ON product_variants;
CREATE POLICY "Users can view all product variants" ON product_variants
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage variants of their own products" ON product_variants;
CREATE POLICY "Users can manage variants of their own products" ON product_variants
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_variants.product_id 
    AND products.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view all variant options" ON variant_options;
CREATE POLICY "Users can view all variant options" ON variant_options
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage variant options of their own products" ON variant_options;
CREATE POLICY "Users can manage variant options of their own products" ON variant_options
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = variant_options.product_id 
    AND products.user_id = auth.uid()
  )
);

-- =============================================================================
-- 6. PRODUCT IMAGES TABLE (Depends on products)
-- =============================================================================

-- Create product_images table to store multiple images per product
CREATE TABLE IF NOT EXISTS product_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for product_images
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_primary ON product_images(product_id, is_primary);

-- Enable RLS for product_images
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Create policies for product_images
DROP POLICY IF EXISTS "Users can view product images" ON product_images;
CREATE POLICY "Users can view product images" ON product_images
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own product images" ON product_images;
CREATE POLICY "Users can insert their own product images" ON product_images
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own product images" ON product_images;
CREATE POLICY "Users can update their own product images" ON product_images
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own product images" ON product_images;
CREATE POLICY "Users can delete their own product images" ON product_images
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM products 
    WHERE products.id = product_images.product_id 
    AND products.user_id = auth.uid()
  )
);

-- =============================================================================
-- 7. CART ITEMS TABLE (Depends on products and product_variants)
-- =============================================================================

-- Create the cart_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, product_id, variant_id)
);

-- Create indexes for cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_variant_id ON cart_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at);

-- Enable RLS for cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Create policies for cart_items
DROP POLICY IF EXISTS "Users can view their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update their own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete their own cart items" ON cart_items;

CREATE POLICY "Users can view their own cart items" ON cart_items
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own cart items" ON cart_items
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own cart items" ON cart_items
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own cart items" ON cart_items
FOR DELETE USING (user_id = auth.uid());

-- =============================================================================
-- 8. ORDERS TABLE (Depends on users and payment_methods)
-- =============================================================================

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  buyer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  order_number VARCHAR(50) UNIQUE,
  items JSONB NOT NULL,
  shipping_info JSONB,
  payment_method_id UUID REFERENCES payment_methods(id),
  discount JSONB,
  subtotal DECIMAL(10,2),
  total DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'draft',
  customer_name VARCHAR(255),
  customer_address TEXT,
  customer_city VARCHAR(255),
  customer_district VARCHAR(255),
  customer_phone VARCHAR(20),
  total_amount DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for orders
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Enable RLS for orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for orders
DROP POLICY IF EXISTS "Allow all operations on orders" ON orders;
CREATE POLICY "Allow all operations on orders" ON orders
  FOR ALL USING (true);

-- =============================================================================
-- 9. FUNCTIONS AND TRIGGERS
-- =============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for products
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for payment methods
CREATE OR REPLACE FUNCTION update_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function for orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_users_updated_at();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_methods_updated_at_trigger ON payment_methods;
CREATE TRIGGER update_payment_methods_updated_at_trigger
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_methods_updated_at();

DROP TRIGGER IF EXISTS update_cart_items_updated_at ON cart_items;
CREATE TRIGGER update_cart_items_updated_at
    BEFORE UPDATE ON cart_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
CREATE TRIGGER update_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_images_updated_at ON product_images;
CREATE TRIGGER update_product_images_updated_at
    BEFORE UPDATE ON product_images
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- 10. STORAGE BUCKETS AND POLICIES
-- =============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('shop-logos', 'shop-logos', true),
  ('products', 'products', true),
  ('quick-reply-images', 'quick-reply-images', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload their own shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own shop logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload template images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view template images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update template images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete template images" ON storage.objects;

-- Create storage policies for shop logos
CREATE POLICY "Users can upload their own shop logos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view shop logos" ON storage.objects
FOR SELECT USING (bucket_id = 'shop-logos');

CREATE POLICY "Users can update their own shop logos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own shop logos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'shop-logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create storage policies for products
CREATE POLICY "Users can upload product images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'products');

CREATE POLICY "Anyone can view product images" ON storage.objects
FOR SELECT USING (bucket_id = 'products');

CREATE POLICY "Users can update product images" ON storage.objects
FOR UPDATE USING (bucket_id = 'products');

CREATE POLICY "Users can delete product images" ON storage.objects
FOR DELETE USING (bucket_id = 'products');

-- Create storage policies for quick reply images
CREATE POLICY "Users can upload template images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'quick-reply-images');

CREATE POLICY "Anyone can view template images" ON storage.objects
FOR SELECT USING (bucket_id = 'quick-reply-images');

CREATE POLICY "Users can update template images" ON storage.objects
FOR UPDATE USING (bucket_id = 'quick-reply-images');

CREATE POLICY "Users can delete template images" ON storage.objects
FOR DELETE USING (bucket_id = 'quick-reply-images');

-- =============================================================================
-- RESTORATION COMPLETE!
-- =============================================================================

-- This script has restored:
-- 1. users table
-- 2. user_profiles table
-- 3. payment_methods table
-- 4. products table
-- 5. product_variants table
-- 6. variant_options table
-- 7. product_images table
-- 8. cart_items table
-- 9. orders table
-- 10. All necessary indexes
-- 11. All RLS policies
-- 12. All triggers and functions
-- 13. Storage buckets and policies

SELECT 'Database restoration completed successfully!' as status;