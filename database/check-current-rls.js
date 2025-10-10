const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in .env file');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkCurrentRLS() {
  console.log('🔍 Checking current RLS status and policies...');
  
  try {
    // Check if RLS is enabled on tables
    console.log('\n🔒 Checking RLS status on tables:');
    const { data: rlsStatus, error: rlsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('products', 'users', 'orders', 'quick_reply_templates')
        ORDER BY tablename;
      `
    });
    
    if (rlsError) {
      console.error('Error checking RLS status:', rlsError);
    } else {
      console.log('RLS Status:', rlsStatus);
    }
    
    // Check current policies
    console.log('\n📋 Checking current policies:');
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          cmd,
          roles,
          qual,
          with_check
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('products', 'users', 'orders', 'quick_reply_templates')
        ORDER BY tablename, policyname;
      `
    });
    
    if (policiesError) {
      console.error('Error checking policies:', policiesError);
    } else {
      console.log('Current Policies:', policies);
    }
    
    // Test actual data access with anon key
    console.log('\n🧪 Testing data access with anon key (should fail if RLS working):');
    
    const testClient = createClient(supabaseUrl, process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY);
    
    // Test products access
    const { data: products, error: productsError } = await testClient
      .from('products')
      .select('id, name, user_id')
      .limit(5);
    
    if (productsError) {
      console.log('✅ Products query failed (RLS working):', productsError.message);
    } else {
      console.log('❌ Products query succeeded (RLS not working):', products?.length || 0, 'products');
      if (products && products.length > 0) {
        console.log('   Sample:', products[0]);
      }
    }
    
    // Test users access
    const { data: users, error: usersError } = await testClient
      .from('users')
      .select('id, email')
      .limit(5);
    
    if (usersError) {
      console.log('✅ Users query failed (RLS working):', usersError.message);
    } else {
      console.log('❌ Users query succeeded (RLS not working):', users?.length || 0, 'users');
    }
    
    // Test orders access
    const { data: orders, error: ordersError } = await testClient
      .from('orders')
      .select('id, seller_id')
      .limit(5);
    
    if (ordersError) {
      console.log('✅ Orders query failed (RLS working):', ordersError.message);
    } else {
      console.log('❌ Orders query succeeded (RLS not working):', orders?.length || 0, 'orders');
    }
    
  } catch (error) {
    console.error('❌ Error checking RLS:', error.message);
  }
}

checkCurrentRLS();