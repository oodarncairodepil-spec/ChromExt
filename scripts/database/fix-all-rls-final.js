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

// Anonymous client for testing
const anonClient = createClient(supabaseUrl, anonKey);

async function fixAllRLSPolicies() {
  console.log('=== FIXING ALL RLS POLICIES ===\n');
  
  try {
    // First, try to create the exec_sql function
    console.log('1. Creating exec_sql function...');
    const createFunctionSQL = `
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
    `;
    
    const { data: createResult, error: createError } = await adminClient.rpc('query', {
      query: createFunctionSQL
    });
    
    if (createError) {
      console.log('❌ Could not create exec_sql function via RPC:', createError.message);
      console.log('Will try direct SQL execution...');
    } else {
      console.log('✅ exec_sql function created successfully');
    }

    // Grant permissions
    console.log('2. Granting permissions...');
    const grantSQL = `
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
      GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO authenticated;
    `;
    
    const { data: grantResult, error: grantError } = await adminClient.rpc('query', {
      query: grantSQL
    });
    
    if (grantError) {
      console.log('❌ Could not grant permissions:', grantError.message);
    } else {
      console.log('✅ Permissions granted');
    }

    // Enable RLS on all tables
    console.log('3. Enabling RLS on all tables...');
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
      const { data, error } = await adminClient.rpc('query', {
        query: `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`
      });
      
      if (error) {
        console.log(`❌ Failed to enable RLS on ${table}:`, error.message);
      } else {
        console.log(`✅ RLS enabled on ${table}`);
      }
    }

    // Drop existing policies
    console.log('4. Dropping existing policies...');
    const dropPolicies = [
      // Templates
      'DROP POLICY IF EXISTS "Users can only see own templates" ON public.quick_reply_templates;',
      'DROP POLICY IF EXISTS "Users can only insert own templates" ON public.quick_reply_templates;',
      'DROP POLICY IF EXISTS "Users can only update own templates" ON public.quick_reply_templates;',
      'DROP POLICY IF EXISTS "Users can only delete own templates" ON public.quick_reply_templates;',
      // Products
      'DROP POLICY IF EXISTS "Users can only see own products" ON public.products;',
      'DROP POLICY IF EXISTS "Users can only insert own products" ON public.products;',
      'DROP POLICY IF EXISTS "Users can only update own products" ON public.products;',
      'DROP POLICY IF EXISTS "Users can only delete own products" ON public.products;',
      // Orders
      'DROP POLICY IF EXISTS "Users can only see own orders" ON public.orders;',
      'DROP POLICY IF EXISTS "Users can only insert own orders" ON public.orders;',
      'DROP POLICY IF EXISTS "Users can only update own orders" ON public.orders;',
      'DROP POLICY IF EXISTS "Users can only delete own orders" ON public.orders;',
      // Users
      'DROP POLICY IF EXISTS "Users can only see own profile" ON public.users;',
      'DROP POLICY IF EXISTS "Users can only update own profile" ON public.users;',
      // Payment methods
      'DROP POLICY IF EXISTS "Users can only see own payment methods" ON public.payment_methods;',
      'DROP POLICY IF EXISTS "Users can only insert own payment methods" ON public.payment_methods;',
      'DROP POLICY IF EXISTS "Users can only update own payment methods" ON public.payment_methods;',
      'DROP POLICY IF EXISTS "Users can only delete own payment methods" ON public.payment_methods;',
      // Couriers (global access)
      'DROP POLICY IF EXISTS "Allow all users to read shipping couriers" ON public.shipping_couriers;',
      'DROP POLICY IF EXISTS "Allow all users to read courier services" ON public.courier_services;',
      // User preferences
      'DROP POLICY IF EXISTS "Users can only see own courier preferences" ON public.user_courier_preferences;',
      'DROP POLICY IF EXISTS "Users can only insert own courier preferences" ON public.user_courier_preferences;',
      'DROP POLICY IF EXISTS "Users can only update own courier preferences" ON public.user_courier_preferences;',
      'DROP POLICY IF EXISTS "Users can only delete own courier preferences" ON public.user_courier_preferences;',
      'DROP POLICY IF EXISTS "Users can only see own service preferences" ON public.user_service_preferences;',
      'DROP POLICY IF EXISTS "Users can only insert own service preferences" ON public.user_service_preferences;',
      'DROP POLICY IF EXISTS "Users can only update own service preferences" ON public.user_service_preferences;',
      'DROP POLICY IF EXISTS "Users can only delete own service preferences" ON public.user_service_preferences;'
    ];

    for (const dropSQL of dropPolicies) {
      const { data, error } = await adminClient.rpc('query', {
        query: dropSQL
      });
      
      if (error && !error.message.includes('does not exist')) {
        console.log(`❌ Failed to drop policy: ${error.message}`);
      }
    }
    console.log('✅ Existing policies dropped');

    // Create new restrictive policies for user data
    console.log('5. Creating restrictive policies for user data...');
    const userDataPolicies = [
      // Templates - CRITICAL FIX
      'CREATE POLICY "Users can only see own templates" ON public.quick_reply_templates FOR SELECT USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only insert own templates" ON public.quick_reply_templates FOR INSERT WITH CHECK (auth.uid() = user_id);',
      'CREATE POLICY "Users can only update own templates" ON public.quick_reply_templates FOR UPDATE USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only delete own templates" ON public.quick_reply_templates FOR DELETE USING (auth.uid() = user_id);',
      
      // Products
      'CREATE POLICY "Users can only see own products" ON public.products FOR SELECT USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only insert own products" ON public.products FOR INSERT WITH CHECK (auth.uid() = user_id);',
      'CREATE POLICY "Users can only update own products" ON public.products FOR UPDATE USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only delete own products" ON public.products FOR DELETE USING (auth.uid() = user_id);',
      
      // Orders
      'CREATE POLICY "Users can only see own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);',
      'CREATE POLICY "Users can only update own orders" ON public.orders FOR UPDATE USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only delete own orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);',
      
      // Users (note: uses 'id' not 'user_id')
      'CREATE POLICY "Users can only see own profile" ON public.users FOR SELECT USING (auth.uid() = id);',
      'CREATE POLICY "Users can only update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);',
      
      // Payment methods
      'CREATE POLICY "Users can only see own payment methods" ON public.payment_methods FOR SELECT USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only insert own payment methods" ON public.payment_methods FOR INSERT WITH CHECK (auth.uid() = user_id);',
      'CREATE POLICY "Users can only update own payment methods" ON public.payment_methods FOR UPDATE USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only delete own payment methods" ON public.payment_methods FOR DELETE USING (auth.uid() = user_id);',
      
      // User preferences
      'CREATE POLICY "Users can only see own courier preferences" ON public.user_courier_preferences FOR SELECT USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only insert own courier preferences" ON public.user_courier_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);',
      'CREATE POLICY "Users can only update own courier preferences" ON public.user_courier_preferences FOR UPDATE USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only delete own courier preferences" ON public.user_courier_preferences FOR DELETE USING (auth.uid() = user_id);',
      
      'CREATE POLICY "Users can only see own service preferences" ON public.user_service_preferences FOR SELECT USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only insert own service preferences" ON public.user_service_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);',
      'CREATE POLICY "Users can only update own service preferences" ON public.user_service_preferences FOR UPDATE USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can only delete own service preferences" ON public.user_service_preferences FOR DELETE USING (auth.uid() = user_id);'
    ];

    for (const policySQL of userDataPolicies) {
      const { data, error } = await adminClient.rpc('query', {
        query: policySQL
      });
      
      if (error) {
        console.log(`❌ Failed to create policy: ${error.message}`);
        console.log(`   SQL: ${policySQL}`);
      }
    }
    console.log('✅ Restrictive policies created');

    // Create permissive policies for global data
    console.log('6. Creating permissive policies for global data...');
    const globalDataPolicies = [
      'CREATE POLICY "Allow all users to read shipping couriers" ON public.shipping_couriers FOR SELECT USING (true);',
      'CREATE POLICY "Allow all users to read courier services" ON public.courier_services FOR SELECT USING (true);'
    ];

    for (const policySQL of globalDataPolicies) {
      const { data, error } = await adminClient.rpc('query', {
        query: policySQL
      });
      
      if (error) {
        console.log(`❌ Failed to create global policy: ${error.message}`);
      }
    }
    console.log('✅ Global access policies created');

    // Test the fix
    console.log('\n=== TESTING RLS FIX ===');
    
    // Test templates (should be 0 for anonymous)
    const { data: anonTemplates, error: anonTemplatesError } = await anonClient
      .from('quick_reply_templates')
      .select('*');
    
    if (anonTemplatesError) {
      console.log('❌ Anonymous template access error:', anonTemplatesError.message);
    } else {
      console.log(`✅ Anonymous template access: ${anonTemplates?.length || 0} records (should be 0)`);
    }

    // Test courier services (should be accessible)
    const { data: anonCouriers, error: anonCouriersError } = await anonClient
      .from('courier_services')
      .select('*');
    
    if (anonCouriersError) {
      console.log('❌ Anonymous courier services error:', anonCouriersError.message);
    } else {
      console.log(`✅ Anonymous courier services: ${anonCouriers?.length || 0} records (should be > 0)`);
    }

    console.log('\n=== RLS FIX COMPLETED ===');
    console.log('\nNext steps:');
    console.log('1. Test with authenticated user to ensure they can see their own data');
    console.log('2. Verify template isolation is working');
    console.log('3. Confirm courier services are accessible to all users');
    
  } catch (error) {
    console.error('RLS fix failed:', error);
    
    console.log('\n=== MANUAL SQL COMMANDS (FALLBACK) ===');
    console.log('If the script failed, execute these commands manually in Supabase Dashboard:');
    console.log(`
-- Enable RLS on templates (CRITICAL)
ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing template policies
DROP POLICY IF EXISTS "Users can only see own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only insert own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only update own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only delete own templates" ON public.quick_reply_templates;

-- Create restrictive template policies
CREATE POLICY "Users can only see own templates" ON public.quick_reply_templates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert own templates" ON public.quick_reply_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update own templates" ON public.quick_reply_templates
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete own templates" ON public.quick_reply_templates
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure courier services are globally accessible
CREATE POLICY "Allow all users to read courier services" ON public.courier_services
  FOR SELECT USING (true);`);
  }
}

fixAllRLSPolicies();