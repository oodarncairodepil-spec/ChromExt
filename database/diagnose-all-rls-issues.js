require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Admin client (service role)
const adminClient = createClient(supabaseUrl, serviceRoleKey);

// Anonymous client
const anonClient = createClient(supabaseUrl, anonKey);

async function checkRLSPolicies() {
  console.log('=== COMPREHENSIVE RLS DIAGNOSTIC ===\n');
  
  try {
    // Check RLS status for all tables
    const { data: rlsStatus, error: rlsError } = await adminClient
      .from('information_schema.tables')
      .select('table_name, row_security')
      .eq('table_schema', 'public')
      .in('table_name', [
        'quick_reply_templates',
        'products', 
        'orders',
        'users',
        'payment_methods',
        'shipping_couriers',
        'courier_services',
        'user_courier_preferences',
        'user_service_preferences'
      ]);
    
    if (rlsError) {
      console.error('Error checking RLS status:', rlsError);
    } else {
      console.log('RLS STATUS FOR TABLES:');
      rlsStatus?.forEach(table => {
        console.log(`- ${table.table_name}: ${table.row_security === 'YES' ? 'ENABLED' : 'DISABLED'}`);
      });
      console.log();
    }

    // Check existing policies
    const { data: policies, error: policiesError } = await adminClient
      .from('information_schema.table_privileges')
      .select('*')
      .eq('table_schema', 'public');
    
    if (policiesError) {
      console.error('Error checking policies:', policiesError);
    }

    // Test data access with anonymous client
    console.log('=== TESTING ANONYMOUS ACCESS ===');
    
    const tables = [
      'quick_reply_templates',
      'products',
      'orders', 
      'users',
      'payment_methods',
      'shipping_couriers',
      'courier_services',
      'user_courier_preferences',
      'user_service_preferences'
    ];

    for (const table of tables) {
      try {
        const { data, error, count } = await anonClient
          .from(table)
          .select('*', { count: 'exact' })
          .limit(5);
        
        if (error) {
          console.log(`❌ ${table}: ERROR - ${error.message}`);
        } else {
          console.log(`✅ ${table}: ${count || data?.length || 0} records accessible`);
          if (data && data.length > 0) {
            console.log(`   Sample record keys: ${Object.keys(data[0]).join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: EXCEPTION - ${err.message}`);
      }
    }

    console.log('\n=== TESTING ADMIN ACCESS ===');
    
    for (const table of tables) {
      try {
        const { data, error, count } = await adminClient
          .from(table)
          .select('*', { count: 'exact' })
          .limit(5);
        
        if (error) {
          console.log(`❌ ${table}: ERROR - ${error.message}`);
        } else {
          console.log(`✅ ${table}: ${count || data?.length || 0} records found`);
          if (data && data.length > 0 && table === 'quick_reply_templates') {
            console.log(`   Template user_ids: ${data.map(t => t.user_id).join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`❌ ${table}: EXCEPTION - ${err.message}`);
      }
    }

    // Check if we can create exec_sql function
    console.log('\n=== CHECKING EXEC_SQL FUNCTION ===');
    try {
      const { data, error } = await adminClient.rpc('exec_sql', {
        sql: 'SELECT 1 as test'
      });
      
      if (error) {
        console.log('❌ exec_sql function not available:', error.message);
        console.log('\n=== MANUAL SQL COMMANDS NEEDED ===');
        console.log('Execute these commands in Supabase Dashboard SQL Editor:');
        console.log(`
-- 1. Create exec_sql function
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql;
  RETURN 'Success';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;

-- 3. Enable RLS on all tables
ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_courier_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_service_preferences ENABLE ROW LEVEL SECURITY;

-- 4. Drop all existing policies
DROP POLICY IF EXISTS "Users can only see own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only insert own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only update own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only delete own templates" ON public.quick_reply_templates;
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
DROP POLICY IF EXISTS "Allow all users to read shipping couriers" ON public.shipping_couriers;
DROP POLICY IF EXISTS "Allow all users to read courier services" ON public.courier_services;
DROP POLICY IF EXISTS "Users can only see own courier preferences" ON public.user_courier_preferences;
DROP POLICY IF EXISTS "Users can only insert own courier preferences" ON public.user_courier_preferences;
DROP POLICY IF EXISTS "Users can only update own courier preferences" ON public.user_courier_preferences;
DROP POLICY IF EXISTS "Users can only delete own courier preferences" ON public.user_courier_preferences;
DROP POLICY IF EXISTS "Users can only see own service preferences" ON public.user_service_preferences;
DROP POLICY IF EXISTS "Users can only insert own service preferences" ON public.user_service_preferences;
DROP POLICY IF EXISTS "Users can only update own service preferences" ON public.user_service_preferences;
DROP POLICY IF EXISTS "Users can only delete own service preferences" ON public.user_service_preferences;

-- 5. Create restrictive policies for user data
CREATE POLICY "Users can only see own templates" ON public.quick_reply_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own templates" ON public.quick_reply_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own templates" ON public.quick_reply_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own templates" ON public.quick_reply_templates
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own products" ON public.products
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own products" ON public.products
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own products" ON public.products
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own products" ON public.products
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own orders" ON public.orders
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own orders" ON public.orders
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can only update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can only see own payment methods" ON public.payment_methods
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own payment methods" ON public.payment_methods
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own payment methods" ON public.payment_methods
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own payment methods" ON public.payment_methods
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own courier preferences" ON public.user_courier_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own courier preferences" ON public.user_courier_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own courier preferences" ON public.user_courier_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own courier preferences" ON public.user_courier_preferences
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see own service preferences" ON public.user_service_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own service preferences" ON public.user_service_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own service preferences" ON public.user_service_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own service preferences" ON public.user_service_preferences
  FOR DELETE USING (auth.uid() = user_id);

-- 6. Create permissive policies for global data
CREATE POLICY "Allow all users to read shipping couriers" ON public.shipping_couriers
  FOR SELECT USING (true);
CREATE POLICY "Allow all users to read courier services" ON public.courier_services
  FOR SELECT USING (true);`);
      } else {
        console.log('✅ exec_sql function is available');
      }
    } catch (err) {
      console.log('❌ exec_sql function test failed:', err.message);
    }

  } catch (error) {
    console.error('Diagnostic failed:', error);
  }
}

checkRLSPolicies();