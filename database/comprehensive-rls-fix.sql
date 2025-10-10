-- COMPREHENSIVE RLS FIX FOR ALL TABLES
-- Based on actual database schema from data2.txt
-- Execute these commands one by one in Supabase SQL Editor

-- ========================================
-- STEP 1: DROP ALL EXISTING POLICIES
-- ========================================

-- Drop policies for quick_reply_templates
DROP POLICY IF EXISTS template_select_own ON public.quick_reply_templates;
DROP POLICY IF EXISTS template_insert_own ON public.quick_reply_templates;
DROP POLICY IF EXISTS template_update_own ON public.quick_reply_templates;
DROP POLICY IF EXISTS template_delete_own ON public.quick_reply_templates;
DROP POLICY IF EXISTS templates_user_select_only ON public.quick_reply_templates;
DROP POLICY IF EXISTS templates_user_insert_only ON public.quick_reply_templates;
DROP POLICY IF EXISTS templates_user_update_only ON public.quick_reply_templates;
DROP POLICY IF EXISTS templates_user_delete_only ON public.quick_reply_templates;

-- Drop policies for products
DROP POLICY IF EXISTS products_select_own ON public.products;
DROP POLICY IF EXISTS products_insert_own ON public.products;
DROP POLICY IF EXISTS products_update_own ON public.products;
DROP POLICY IF EXISTS products_delete_own ON public.products;

-- Drop policies for orders
DROP POLICY IF EXISTS orders_select_own ON public.orders;
DROP POLICY IF EXISTS orders_insert_own ON public.orders;
DROP POLICY IF EXISTS orders_update_own ON public.orders;
DROP POLICY IF EXISTS orders_delete_own ON public.orders;

-- Drop policies for users
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_delete_own ON public.users;

-- Drop policies for payment_methods
DROP POLICY IF EXISTS payment_methods_select_own ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_insert_own ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_update_own ON public.payment_methods;
DROP POLICY IF EXISTS payment_methods_delete_own ON public.payment_methods;

-- Drop policies for user_courier_preferences
DROP POLICY IF EXISTS user_courier_preferences_select_own ON public.user_courier_preferences;
DROP POLICY IF EXISTS user_courier_preferences_insert_own ON public.user_courier_preferences;
DROP POLICY IF EXISTS user_courier_preferences_update_own ON public.user_courier_preferences;
DROP POLICY IF EXISTS user_courier_preferences_delete_own ON public.user_courier_preferences;

-- Drop policies for user_service_preferences
DROP POLICY IF EXISTS user_service_preferences_select_own ON public.user_service_preferences;
DROP POLICY IF EXISTS user_service_preferences_insert_own ON public.user_service_preferences;
DROP POLICY IF EXISTS user_service_preferences_update_own ON public.user_service_preferences;
DROP POLICY IF EXISTS user_service_preferences_delete_own ON public.user_service_preferences;

-- Drop policies for new tables
DROP POLICY IF EXISTS cart_items_select_own ON public.cart_items;
DROP POLICY IF EXISTS cart_items_insert_own ON public.cart_items;
DROP POLICY IF EXISTS cart_items_update_own ON public.cart_items;
DROP POLICY IF EXISTS cart_items_delete_own ON public.cart_items;

DROP POLICY IF EXISTS product_images_select_own ON public.product_images;
DROP POLICY IF EXISTS product_images_insert_own ON public.product_images;
DROP POLICY IF EXISTS product_images_update_own ON public.product_images;
DROP POLICY IF EXISTS product_images_delete_own ON public.product_images;

DROP POLICY IF EXISTS product_variants_select_own ON public.product_variants;
DROP POLICY IF EXISTS product_variants_insert_own ON public.product_variants;
DROP POLICY IF EXISTS product_variants_update_own ON public.product_variants;
DROP POLICY IF EXISTS product_variants_delete_own ON public.product_variants;

DROP POLICY IF EXISTS variant_options_select_own ON public.variant_options;
DROP POLICY IF EXISTS variant_options_insert_own ON public.variant_options;
DROP POLICY IF EXISTS variant_options_update_own ON public.variant_options;
DROP POLICY IF EXISTS variant_options_delete_own ON public.variant_options;
DROP POLICY IF EXISTS variant_options_select_owner ON public.variant_options;
DROP POLICY IF EXISTS variant_options_insert_owner ON public.variant_options;
DROP POLICY IF EXISTS variant_options_update_owner ON public.variant_options;
DROP POLICY IF EXISTS variant_options_delete_owner ON public.variant_options;

DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_insert_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_update_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_delete_own ON public.user_profiles;

-- ========================================
-- STEP 2: CREATE RESTRICTIVE POLICIES FOR USER-SPECIFIC DATA
-- ========================================

-- Quick Reply Templates (user_id column)
CREATE POLICY quick_reply_templates_select_owner ON public.quick_reply_templates
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY quick_reply_templates_insert_owner ON public.quick_reply_templates
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY quick_reply_templates_update_owner ON public.quick_reply_templates
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY quick_reply_templates_delete_owner ON public.quick_reply_templates
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Products (user_id column)
CREATE POLICY products_select_owner ON public.products
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY products_insert_owner ON public.products
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY products_update_owner ON public.products
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY products_delete_owner ON public.products
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Orders (buyer_id column)
CREATE POLICY orders_select_buyer ON public.orders
FOR SELECT TO authenticated
USING (auth.uid() = buyer_id);

CREATE POLICY orders_insert_buyer ON public.orders
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY orders_update_buyer ON public.orders
FOR UPDATE TO authenticated
USING (auth.uid() = buyer_id)
WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY orders_delete_buyer ON public.orders
FOR DELETE TO authenticated
USING (auth.uid() = buyer_id);

-- Users (id column)
CREATE POLICY users_select_self ON public.users
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY users_insert_self ON public.users
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY users_update_self ON public.users
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY users_delete_self ON public.users
FOR DELETE TO authenticated
USING (auth.uid() = id);

-- User Profiles (user_id column)
CREATE POLICY user_profiles_select_owner ON public.user_profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY user_profiles_insert_owner ON public.user_profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_update_owner ON public.user_profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_profiles_delete_owner ON public.user_profiles
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Payment Methods (user_id column)
CREATE POLICY payment_methods_select_owner ON public.payment_methods
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY payment_methods_insert_owner ON public.payment_methods
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY payment_methods_update_owner ON public.payment_methods
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY payment_methods_delete_owner ON public.payment_methods
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- User Courier Preferences (user_id column)
CREATE POLICY user_courier_preferences_select_owner ON public.user_courier_preferences
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY user_courier_preferences_insert_owner ON public.user_courier_preferences
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_courier_preferences_update_owner ON public.user_courier_preferences
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_courier_preferences_delete_owner ON public.user_courier_preferences
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- User Service Preferences (user_id column)
CREATE POLICY user_service_preferences_select_owner ON public.user_service_preferences
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY user_service_preferences_insert_owner ON public.user_service_preferences
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_service_preferences_update_owner ON public.user_service_preferences
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_service_preferences_delete_owner ON public.user_service_preferences
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Cart Items (user_id column)
CREATE POLICY cart_items_select_owner ON public.cart_items
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY cart_items_insert_owner ON public.cart_items
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY cart_items_update_owner ON public.cart_items
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY cart_items_delete_owner ON public.cart_items
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Product Images (linked to products via product_id)
CREATE POLICY product_images_select_owner ON public.product_images
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_images.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY product_images_insert_owner ON public.product_images
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_images.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY product_images_update_owner ON public.product_images
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_images.product_id 
  AND products.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_images.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY product_images_delete_owner ON public.product_images
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_images.product_id 
  AND products.user_id = auth.uid()
));

-- Product Variants (linked to products via product_id)
CREATE POLICY product_variants_select_owner ON public.product_variants
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_variants.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY product_variants_insert_owner ON public.product_variants
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_variants.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY product_variants_update_owner ON public.product_variants
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_variants.product_id 
  AND products.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_variants.product_id 
  AND products.user_id = auth.uid()
));

CREATE POLICY product_variants_delete_owner ON public.product_variants
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products 
  WHERE products.id = product_variants.product_id 
  AND products.user_id = auth.uid()
));

-- Variant Options (linked directly to products via product_id)
CREATE POLICY variant_options_select_owner ON public.variant_options
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.id = variant_options.product_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY variant_options_insert_owner ON public.variant_options
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.id = variant_options.product_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY variant_options_update_owner ON public.variant_options
FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.id = variant_options.product_id 
  AND p.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.id = variant_options.product_id 
  AND p.user_id = auth.uid()
));

CREATE POLICY variant_options_delete_owner ON public.variant_options
FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.products p
  WHERE p.id = variant_options.product_id 
  AND p.user_id = auth.uid()
));

-- ========================================
-- STEP 3: CREATE PERMISSIVE POLICIES FOR GLOBAL/REFERENCE DATA
-- ========================================

-- Shipping Couriers (global data - readable by all authenticated users)
CREATE POLICY shipping_couriers_select_all ON public.shipping_couriers
FOR SELECT TO authenticated
USING (true);

-- Courier Services (global data - readable by all authenticated users)
CREATE POLICY courier_services_select_all ON public.courier_services
FOR SELECT TO authenticated
USING (true);

-- Geographic data (global reference data - readable by all authenticated users)
CREATE POLICY provinces_select_all ON public.provinces
FOR SELECT TO authenticated
USING (true);

CREATE POLICY regencies_select_all ON public.regencies
FOR SELECT TO authenticated
USING (true);

CREATE POLICY districts_select_all ON public.districts
FOR SELECT TO authenticated
USING (true);

-- regions_flat is a view, not a table - RLS policies cannot be applied to views

-- ========================================
-- STEP 4: VERIFICATION QUERIES
-- ========================================

-- Test 1: Check quick_reply_templates (should return 0 when unauthenticated)
SELECT COUNT(*) as template_count FROM public.quick_reply_templates;

-- Test 2: Check products (should return 0 when unauthenticated)
SELECT COUNT(*) as product_count FROM public.products;

-- Test 3: Check global data (should return > 0 when authenticated)
-- Note: Run this after authentication
-- SELECT COUNT(*) as courier_count FROM public.shipping_couriers;

-- Test 4: List all active policies
SELECT pol.polname AS policy_name,
       tbl.relname AS table_name,
       pol.polcmd AS command
FROM pg_policy pol
JOIN pg_class tbl ON pol.polrelid = tbl.oid
JOIN pg_namespace nsp ON tbl.relnamespace = nsp.oid
WHERE nsp.nspname = 'public'
ORDER BY table_name, policy_name;