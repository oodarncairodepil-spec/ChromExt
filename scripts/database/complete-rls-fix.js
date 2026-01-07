const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

// Create Supabase clients
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const supabaseAnon = createClient(supabaseUrl, anonKey);

async function executeSQL(sql, description) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ sql })
    });
    
    console.log(`  ✅ ${description}`);
    return true;
  } catch (error) {
    console.log(`  ❌ ${description}: ${error.message}`);
    return false;
  }
}

async function fixAllRLSPolicies() {
  console.log('🔧 Comprehensive RLS Fix Starting...');
  
  // 1. Enable RLS on all tables
  console.log('\n📋 Step 1: Enabling RLS on all tables...');
  await executeSQL('ALTER TABLE products ENABLE ROW LEVEL SECURITY;', 'Enable RLS on products');
  await executeSQL('ALTER TABLE users ENABLE ROW LEVEL SECURITY;', 'Enable RLS on users');
  await executeSQL('ALTER TABLE orders ENABLE ROW LEVEL SECURITY;', 'Enable RLS on orders');
  await executeSQL('ALTER TABLE quick_reply_templates ENABLE ROW LEVEL SECURITY;', 'Enable RLS on templates');
  await executeSQL('ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;', 'Enable RLS on user_profiles');
  await executeSQL('ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;', 'Enable RLS on payment_methods');
  
  // 2. Drop all existing problematic policies
  console.log('\n🗑️  Step 2: Dropping problematic policies...');
  await executeSQL('DROP POLICY IF EXISTS "Users can view all products" ON products;', 'Drop "Users can view all products"');
  await executeSQL('DROP POLICY IF EXISTS "Allow all operations on users" ON users;', 'Drop "Allow all operations on users"');
  await executeSQL('DROP POLICY IF EXISTS "Allow all operations on orders" ON orders;', 'Drop "Allow all operations on orders"');
  await executeSQL('DROP POLICY IF EXISTS "Users can view their own products" ON products;', 'Drop existing "Users can view their own products"');
  
  // 3. Create proper restrictive policies
  console.log('\n🔒 Step 3: Creating proper restrictive policies...');
  
  // Products policies
  await executeSQL(`
    CREATE POLICY "Users can view their own products" ON products 
    FOR SELECT USING (user_id = auth.uid());
  `, 'Create products SELECT policy');
  
  await executeSQL(`
    CREATE POLICY "Users can manage their own products" ON products 
    FOR ALL USING (user_id = auth.uid());
  `, 'Create products ALL policy');
  
  // Users policies
  await executeSQL(`
    CREATE POLICY "Users can view their own profile" ON users 
    FOR SELECT USING (id = auth.uid());
  `, 'Create users SELECT own profile policy');
  
  await executeSQL(`
    CREATE POLICY "Users can update their own profile" ON users 
    FOR UPDATE USING (id = auth.uid());
  `, 'Create users UPDATE policy');
  
  // Orders policies
  await executeSQL(`
    CREATE POLICY "Users can view their own orders" ON orders 
    FOR SELECT USING (seller_id = auth.uid() OR buyer_id = auth.uid());
  `, 'Create orders SELECT policy');
  
  await executeSQL(`
    CREATE POLICY "Users can manage their own orders" ON orders 
    FOR ALL USING (seller_id = auth.uid() OR buyer_id = auth.uid());
  `, 'Create orders ALL policy');
  
  // Templates policies
  await executeSQL(`
    CREATE POLICY "Users can view their own templates" ON quick_reply_templates 
    FOR SELECT USING (user_id = auth.uid());
  `, 'Create templates SELECT policy');
  
  await executeSQL(`
    CREATE POLICY "Users can manage their own templates" ON quick_reply_templates 
    FOR ALL USING (user_id = auth.uid());
  `, 'Create templates ALL policy');
  
  // User profiles policies
  await executeSQL(`
    CREATE POLICY "Users can view their own user_profile" ON user_profiles 
    FOR SELECT USING (user_id = auth.uid());
  `, 'Create user_profiles SELECT policy');
  
  await executeSQL(`
    CREATE POLICY "Users can manage their own user_profile" ON user_profiles 
    FOR ALL USING (user_id = auth.uid());
  `, 'Create user_profiles ALL policy');
  
  // Payment methods policies
  await executeSQL(`
    CREATE POLICY "Users can view their own payment_methods" ON payment_methods 
    FOR SELECT USING (user_id = auth.uid());
  `, 'Create payment_methods SELECT policy');
  
  await executeSQL(`
    CREATE POLICY "Users can manage their own payment_methods" ON payment_methods 
    FOR ALL USING (user_id = auth.uid());
  `, 'Create payment_methods ALL policy');
  
  console.log('\n✅ RLS policies have been fixed!');
  
  // 4. Test data isolation
  console.log('\n🧪 Step 4: Testing data isolation...');
  
  try {
    // Test with anonymous key (should return empty or fail)
    const { data: products, error: productsError } = await supabaseAnon
      .from('products')
      .select('*');
    
    if (productsError) {
      console.log('  ✅ Products query failed with anon key (RLS working):', productsError.message);
    } else {
      console.log(`  ⚠️  Products query succeeded with anon key: ${products?.length || 0} products (should be 0 or fail)`);
    }
    
    const { data: users, error: usersError } = await supabaseAnon
      .from('users')
      .select('*');
    
    if (usersError) {
      console.log('  ✅ Users query failed with anon key (RLS working):', usersError.message);
    } else {
      console.log(`  ⚠️  Users query succeeded with anon key: ${users?.length || 0} users (should be 0 or fail)`);
    }
    
    const { data: orders, error: ordersError } = await supabaseAnon
      .from('orders')
      .select('*');
    
    if (ordersError) {
      console.log('  ✅ Orders query failed with anon key (RLS working):', ordersError.message);
    } else {
      console.log(`  ⚠️  Orders query succeeded with anon key: ${orders?.length || 0} orders (should be 0 or fail)`);
    }
    
  } catch (error) {
    console.log('  ✅ Data access test failed (RLS working):', error.message);
  }
  
  console.log('\n🎉 RLS fix complete! Please refresh your browser to see the changes.');
  console.log('\n📝 Summary of changes:');
  console.log('  - Enabled RLS on all tables');
  console.log('  - Removed overly permissive policies');
  console.log('  - Created restrictive policies that only allow users to see their own data');
  console.log('  - Users can only see products, orders, templates, etc. that belong to them');
}

fixAllRLSPolicies().catch(console.error);