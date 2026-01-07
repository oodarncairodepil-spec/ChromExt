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

async function fixRLSPolicies() {
  console.log('🔧 Starting RLS policy fixes...');
  
  try {
    // 1. Fix Products Table RLS
    console.log('\n📦 Fixing Products table RLS policies...');
    
    // Drop overly permissive policy
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Users can view all products" ON products;`
    });
    
    // Create proper policy
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can view their own products" ON products FOR SELECT USING (user_id = auth.uid());`
    });
    
    console.log('✅ Products table RLS fixed');
    
    // 2. Fix Users Table RLS
    console.log('\n👥 Fixing Users table RLS policies...');
    
    // Drop overly permissive policy
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Allow all operations on users" ON users;`
    });
    
    // Create proper policies
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Sellers can view their customers" ON users FOR SELECT USING (id IN (SELECT DISTINCT buyer_id FROM orders WHERE seller_id = auth.uid() AND buyer_id IS NOT NULL));`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Sellers can create customers" ON users FOR INSERT WITH CHECK (true);`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Sellers can update their customers" ON users FOR UPDATE USING (id IN (SELECT DISTINCT buyer_id FROM orders WHERE seller_id = auth.uid() AND buyer_id IS NOT NULL));`
    });
    
    console.log('✅ Users table RLS fixed');
    
    // 3. Fix Orders Table RLS
    console.log('\n📋 Fixing Orders table RLS policies...');
    
    // Drop overly permissive policy
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Allow all operations on orders" ON orders;`
    });
    
    // Create proper policies
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (seller_id = auth.uid());`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can create their own orders" ON orders FOR INSERT WITH CHECK (seller_id = auth.uid());`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can update their own orders" ON orders FOR UPDATE USING (seller_id = auth.uid());`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can delete their own orders" ON orders FOR DELETE USING (seller_id = auth.uid());`
    });
    
    console.log('✅ Orders table RLS fixed');
    
    console.log('\n🎉 All RLS policies have been successfully fixed!');
    console.log('\n🔒 Data isolation is now properly enforced:');
    console.log('   • Users can only see their own products');
    console.log('   • Users can only see customers who have ordered from them');
    console.log('   • Users can only see their own orders');
    console.log('\n⚠️  Please refresh your browser to see the changes take effect.');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error.message);
    
    if (error.message.includes('exec_sql')) {
      console.log('\n🔧 Alternative: Run the SQL manually in Supabase Dashboard:');
      console.log('   1. Go to https://supabase.com/dashboard');
      console.log('   2. Select your project');
      console.log('   3. Go to SQL Editor');
      console.log('   4. Run the contents of supabase/migrations/fix-rls-policies.sql');
    }
    
    process.exit(1);
  }
}

fixRLSPolicies();