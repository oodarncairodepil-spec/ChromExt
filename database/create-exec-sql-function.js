const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in .env file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function...');
  
  try {
    // First, let's try a direct approach to check and fix RLS
    console.log('\n🔍 Checking current table configurations...');
    
    // Use the PostgreSQL REST API to execute raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({
        sql: `
          -- Create exec_sql function if it doesn't exist
          CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
          RETURNS json
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          DECLARE
            result json;
          BEGIN
            EXECUTE sql;
            GET DIAGNOSTICS result = ROW_COUNT;
            RETURN json_build_object('success', true, 'rows_affected', result);
          EXCEPTION
            WHEN OTHERS THEN
              RETURN json_build_object('success', false, 'error', SQLERRM);
          END;
          $$;
        `
      })
    });
    
    if (!response.ok) {
      console.log('❌ Failed to create function via REST API');
      
      // Alternative approach: Use Supabase client directly with raw SQL
      console.log('\n🔄 Trying alternative approach...');
      
      // Let's check what tables exist and their RLS status
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['products', 'users', 'orders']);
      
      if (tablesError) {
        console.error('Error checking tables:', tablesError);
      } else {
        console.log('✅ Found tables:', tables?.map(t => t.table_name));
      }
      
      // Now let's manually fix the RLS policies using individual queries
      console.log('\n🔧 Manually fixing RLS policies...');
      
      // Fix products table
      console.log('📦 Fixing products table...');
      
      // Enable RLS on products
      try {
        await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
          },
          body: JSON.stringify({
            sql: 'ALTER TABLE products ENABLE ROW LEVEL SECURITY;'
          })
        });
        console.log('  ✅ RLS enabled on products');
      } catch (e) {
        console.log('  ⚠️  RLS enable failed (might already be enabled)');
      }
      
      // Drop and recreate policies for products
      const productsPolicies = [
        'DROP POLICY IF EXISTS "Users can view all products" ON products;',
        'DROP POLICY IF EXISTS "Users can view their own products" ON products;',
        'CREATE POLICY "Users can view their own products" ON products FOR SELECT USING (user_id = auth.uid());'
      ];
      
      for (const policy of productsPolicies) {
        try {
          const policyResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey
            },
            body: JSON.stringify({ sql: policy })
          });
          console.log(`  ✅ Executed: ${policy.substring(0, 50)}...`);
        } catch (e) {
          console.log(`  ⚠️  Failed: ${policy.substring(0, 50)}...`);
        }
      }
      
    } else {
      console.log('✅ exec_sql function created successfully');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    console.log('\n🔧 Manual fix required:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the following SQL:');
    console.log(`
-- Enable RLS and fix policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop problematic policies
DROP POLICY IF EXISTS "Users can view all products" ON products;
DROP POLICY IF EXISTS "Allow all operations on users" ON users;
DROP POLICY IF EXISTS "Allow all operations on orders" ON orders;

-- Create proper policies
CREATE POLICY "Users can view their own products" ON products FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Sellers can view their customers" ON users FOR SELECT USING (id IN (SELECT DISTINCT buyer_id FROM orders WHERE seller_id = auth.uid() AND buyer_id IS NOT NULL));
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (seller_id = auth.uid());
`);
  }
}

createExecSqlFunction();