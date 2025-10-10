const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create anonymous client (no authentication)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTableAccess(tableName, expectedCount = 0) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' });
    
    if (error) {
      console.log(`❌ ${tableName}: Error - ${error.message}`);
      return false;
    }
    
    const actualCount = count || (data ? data.length : 0);
    const status = actualCount === expectedCount ? '✅' : '❌';
    console.log(`${status} ${tableName}: ${actualCount} records (expected ${expectedCount})`);
    
    return actualCount === expectedCount;
  } catch (err) {
    console.log(`❌ ${tableName}: Exception - ${err.message}`);
    return false;
  }
}

async function testRLSPolicies() {
  console.log('\n🔍 Testing RLS Policies with Anonymous Access\n');
  console.log('=' .repeat(60));
  
  // Test user-specific data (should be restricted - 0 records)
  console.log('\n📋 USER-SPECIFIC DATA (should be restricted):');
  const userTables = [
    'quick_reply_templates',
    'products', 
    'orders',
    'users',
    'user_profiles',
    'payment_methods',
    'user_courier_preferences', 
    'user_service_preferences',
    'cart_items',
    'product_images',
    'product_variants',
    'variant_options'
  ];
  
  let userDataRestricted = true;
  for (const table of userTables) {
    const isRestricted = await testTableAccess(table, 0);
    if (!isRestricted) userDataRestricted = false;
  }
  
  // Test global/reference data (should be accessible)
  console.log('\n🌍 GLOBAL/REFERENCE DATA (should be accessible):');
  const globalTables = [
    'shipping_couriers',
    'courier_services', 
    'provinces',
    'regencies',
    'districts'
  ];
  
  let globalDataAccessible = true;
  for (const table of globalTables) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });
      
      if (error) {
        console.log(`❌ ${table}: Error - ${error.message}`);
        globalDataAccessible = false;
      } else {
        const actualCount = count || (data ? data.length : 0);
        const status = actualCount > 0 ? '✅' : '⚠️';
        console.log(`${status} ${table}: ${actualCount} records (expected > 0)`);
        if (actualCount === 0) globalDataAccessible = false;
      }
    } catch (err) {
      console.log(`❌ ${table}: Exception - ${err.message}`);
      globalDataAccessible = false;
    }
  }
  
  // Admin verification (with service role key)
  console.log('\n🔧 ADMIN VERIFICATION (total records):');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (serviceRoleKey) {
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    const allTables = [...userTables, ...globalTables];
    for (const table of allTables) {
      try {
        const { count, error } = await adminClient
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: Admin error - ${error.message}`);
        } else {
          console.log(`📊 ${table}: ${count || 0} total records`);
        }
      } catch (err) {
        console.log(`❌ ${table}: Admin exception - ${err.message}`);
      }
    }
  } else {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found - skipping admin verification');
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 RLS POLICY TEST SUMMARY:');
  console.log('=' .repeat(60));
  
  if (userDataRestricted && globalDataAccessible) {
    console.log('✅ SUCCESS: RLS policies are working correctly!');
    console.log('   - User data is properly restricted');
    console.log('   - Global data is accessible');
    return true;
  } else {
    console.log('❌ ISSUES DETECTED:');
    if (!userDataRestricted) {
      console.log('   - Some user data is still accessible to anonymous users');
    }
    if (!globalDataAccessible) {
      console.log('   - Some global data is not accessible');
    }
    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Execute the comprehensive-rls-fix.sql script in Supabase Dashboard');
    console.log('   2. Run this verification script again');
    console.log('   3. Test your application with authenticated users');
    return false;
  }
}

// Run the test
testRLSPolicies().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});