-- CRITICAL RLS FIX FOR TEMPLATE ISOLATION AND DATA ACCESS
-- Execute these commands in Supabase Dashboard SQL Editor

-- 1. Enable RLS on quick_reply_templates (CRITICAL - this is the main issue)
ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies for templates
DROP POLICY IF EXISTS "Users can only see own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only insert own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only update own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only delete own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.quick_reply_templates;

-- 3. Create restrictive policies for templates (OWNER-ONLY ACCESS)
CREATE POLICY "Users can only see own templates" ON public.quick_reply_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert own templates" ON public.quick_reply_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update own templates" ON public.quick_reply_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete own templates" ON public.quick_reply_templates
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Ensure RLS is enabled on other user data tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courier_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_service_preferences ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies for other tables
DROP POLICY IF EXISTS "Users can only see own products" ON public.products;
DROP POLICY IF EXISTS "Users can only insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can only update own products" ON public.products;
DROP POLICY IF EXISTS "Users can only delete own products" ON public.products;

DROP POLICY IF EXISTS "Users can only see own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can only insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can only update own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can only delete own orders" ON public.orders;

DROP POLICY IF EXISTS "Users can only see own profile" ON public.users;
DROP POLICY IF EXISTS "Users can only update own profile" ON public.users;

DROP POLICY IF EXISTS "Users can only see own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can only insert own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can only update own payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Users can only delete own payment methods" ON public.payment_methods;

DROP POLICY IF EXISTS "Users can only see own courier preferences" ON public.user_courier_preferences;
DROP POLICY IF EXISTS "Users can only insert own courier preferences" ON public.user_courier_preferences;
DROP POLICY IF EXISTS "Users can only update own courier preferences" ON public.user_courier_preferences;
DROP POLICY IF EXISTS "Users can only delete own courier preferences" ON public.user_courier_preferences;

DROP POLICY IF EXISTS "Users can only see own service preferences" ON public.user_service_preferences;
DROP POLICY IF EXISTS "Users can only insert own service preferences" ON public.user_service_preferences;
DROP POLICY IF EXISTS "Users can only update own service preferences" ON public.user_service_preferences;
DROP POLICY IF EXISTS "Users can only delete own service preferences" ON public.user_service_preferences;

-- 6. Create restrictive policies for user data tables
-- Products
CREATE POLICY "Users can only see own products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

-- Orders (uses buyer_id column)
CREATE POLICY "Users can only see own orders" ON public.orders
  FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Users can only insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Users can only update own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "Users can only delete own orders" ON public.orders
  FOR DELETE USING (auth.uid() = buyer_id);

-- Users (note: uses 'id' column, not 'user_id')
CREATE POLICY "Users can only see own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can only update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Payment Methods
CREATE POLICY "Users can only see own payment methods" ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own payment methods" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own payment methods" ON public.payment_methods
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own payment methods" ON public.payment_methods
  FOR DELETE USING (auth.uid() = user_id);

-- User Courier Preferences
CREATE POLICY "Users can only see own courier preferences" ON public.user_courier_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own courier preferences" ON public.user_courier_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own courier preferences" ON public.user_courier_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own courier preferences" ON public.user_courier_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- User Service Preferences
CREATE POLICY "Users can only see own service preferences" ON public.user_service_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own service preferences" ON public.user_service_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own service preferences" ON public.user_service_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own service preferences" ON public.user_service_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- 7. Ensure global data is accessible to all authenticated users
ALTER TABLE public.shipping_couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_services ENABLE ROW LEVEL SECURITY;

-- Drop existing global policies
DROP POLICY IF EXISTS "Allow all users to read shipping couriers" ON public.shipping_couriers;
DROP POLICY IF EXISTS "Allow all users to read courier services" ON public.courier_services;

-- Create permissive policies for global data
CREATE POLICY "Allow all users to read shipping couriers" ON public.shipping_couriers
  FOR SELECT USING (true);
CREATE POLICY "Allow all users to read courier services" ON public.courier_services
  FOR SELECT USING (true);

-- 8. Verification queries (run these after applying the policies)
-- These should return 0 records when run as anonymous user:
-- SELECT COUNT(*) FROM quick_reply_templates;
-- SELECT COUNT(*) FROM products;
-- SELECT COUNT(*) FROM orders;
-- SELECT COUNT(*) FROM users;
-- SELECT COUNT(*) FROM payment_methods;
-- SELECT COUNT(*) FROM user_courier_preferences;
-- SELECT COUNT(*) FROM user_service_preferences;

-- These should return records when run as anonymous user:
-- SELECT COUNT(*) FROM shipping_couriers;
-- SELECT COUNT(*) FROM courier_services;

COMMIT;