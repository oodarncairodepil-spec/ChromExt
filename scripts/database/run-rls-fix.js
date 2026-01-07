const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- PLASMO_PUBLIC_SUPABASE_URL');
  console.error('- PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for data isolation...');
  
  try {
    // Fix Products table - remove overly permissive policy
    console.log('📦 Fixing products table RLS...');
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Users can view all products" ON products;`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Users can view their own products" ON products FOR SELECT USING (user_id = auth.uid());`
    });
    
    // Fix Users table - remove overly permissive policy
    console.log('👥 Fixing users table RLS...');
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Allow all operations on users" ON users;`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Sellers can view their customers" ON users FOR SELECT USING (
        id IN (
          SELECT DISTINCT buyer_id 
          FROM orders 
          WHERE seller_id = auth.uid() 
          AND buyer_id IS NOT NULL
        )
      );`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Sellers can create customers" ON users FOR INSERT WITH CHECK (true);`
    });
    
    await supabase.rpc('exec_sql', {
      sql: `CREATE POLICY "Sellers can update their customers" ON users FOR UPDATE USING (
        id IN (
          SELECT DISTINCT buyer_id 
          FROM orders 
          WHERE seller_id = auth.uid() 
          AND buyer_id IS NOT NULL
        )
      );`
    });
    
    // Fix Orders table - remove overly permissive policy
    console.log('📋 Fixing orders table RLS...');
    await supabase.rpc('exec_sql', {
      sql: `DROP POLICY IF EXISTS "Allow all operations on orders" ON orders;`
    });
    
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
    
    console.log('✅ RLS policies have been fixed successfully!');
    console.log('🔒 Data isolation is now properly enforced.');
    console.log('👤 Users can now only see their own data.');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error.message);
    process.exit(1);
  }
}

// Alternative approach using direct SQL execution
async function fixRLSPoliciesDirectSQL() {
  console.log('🔧 Fixing RLS policies using direct SQL execution...');
  
  const sqlCommands = [
    // Products table fixes
    `DROP POLICY IF EXISTS "Users can view all products" ON products;`,
    `CREATE POLICY "Users can view their own products" ON products FOR SELECT USING (user_id = auth.uid());`,
    
    // Users table fixes
    `DROP POLICY IF EXISTS "Allow all operations on users" ON users;`,
    `CREATE POLICY "Sellers can view their customers" ON users FOR SELECT USING (
      id IN (
        SELECT DISTINCT buyer_id 
        FROM orders 
        WHERE seller_id = auth.uid() 
        AND buyer_id IS NOT NULL
      )
    );`,
    `CREATE POLICY "Sellers can create customers" ON users FOR INSERT WITH CHECK (true);`,
    `CREATE POLICY "Sellers can update their customers" ON users FOR UPDATE USING (
      id IN (
        SELECT DISTINCT buyer_id 
        FROM orders 
        WHERE seller_id = auth.uid() 
        AND buyer_id IS NOT NULL
      )
    );`,
    
    // Orders table fixes
    `DROP POLICY IF EXISTS "Allow all operations on orders" ON orders;`,
    `CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (seller_id = auth.uid());`,
    `CREATE POLICY "Users can create their own orders" ON orders FOR INSERT WITH CHECK (seller_id = auth.uid());`,
    `CREATE POLICY "Users can update their own orders" ON orders FOR UPDATE USING (seller_id = auth.uid());`,
    `CREATE POLICY "Users can delete their own orders" ON orders FOR DELETE USING (seller_id = auth.uid());`
  ];
  
  try {
    for (const sql of sqlCommands) {
      console.log(`Executing: ${sql.substring(0, 50)}...`);
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error(`Error executing SQL: ${error.message}`);
        throw error;
      }
    }
    
    console.log('✅ All RLS policies have been fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error.message);
    console.log('\n📝 Manual fix required:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Run the contents of supabase/migrations/fix-rls-policies.sql');
    process.exit(1);
  }
}

// Run the fix
fixRLSPoliciesDirectSQL();