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
    
    if (!response.ok) {
      const error = await response.text();
      console.log(`  ❌ ${description}: ${error}`);
      return false;
    }
    
    const result = await response.text();
    console.log(`  ✅ ${description}`);
    return true;
  } catch (error) {
    console.log(`  ❌ ${description}: ${error.message}`);
    return false;
  }
}

async function verifyRLSAndAuth() {
  console.log('🔍 Verifying RLS Policies and Authentication...');
  
  // 1. Check if RLS is enabled on tables
  console.log('\n📋 Step 1: Checking RLS status on tables...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ 
        sql: `
          SELECT 
            schemaname,
            tablename,
            rowsecurity
          FROM pg_tables 
          WHERE schemaname = 'public' 
            AND tablename IN ('products', 'users', 'orders', 'quick_reply_templates')
          ORDER BY tablename;
        `
      })
    });
    
    if (response.ok) {
      console.log('  ✅ RLS status check completed');
    }
  } catch (error) {
    console.log('  ❌ Failed to check RLS status');
  }
  
  // 2. Check current policies
  console.log('\n🔒 Step 2: Checking current policies...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      },
      body: JSON.stringify({ 
        sql: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE schemaname = 'public' 
            AND tablename IN ('products', 'users', 'orders', 'quick_reply_templates')
          ORDER BY tablename, policyname;
        `
      })
    });
    
    if (response.ok) {
      console.log('  ✅ Policies check completed');
    }
  } catch (error) {
    console.log('  ❌ Failed to check policies');
  }
  
  // 3. Test data access with different authentication states
  console.log('\n🧪 Step 3: Testing data access...');
  
  // Test with anonymous key (should fail or return empty)
  try {
    const { data: products, error: productsError } = await supabaseAnon
      .from('products')
      .select('id, name, user_id')
      .limit(5);
    
    if (productsError) {
      console.log('  ✅ Products query failed with anon key (RLS working):', productsError.message);
    } else {
      console.log(`  ⚠️  Products query succeeded with anon key: ${products?.length || 0} products`);
      if (products && products.length > 0) {
        console.log('    📋 Sample products:', products.map(p => `ID: ${p.id}, Name: ${p.name}, User: ${p.user_id}`));
      }
    }
  } catch (error) {
    console.log('  ✅ Products access blocked (RLS working):', error.message);
  }
  
  try {
    const { data: users, error: usersError } = await supabaseAnon
      .from('users')
      .select('id, email')
      .limit(5);
    
    if (usersError) {
      console.log('  ✅ Users query failed with anon key (RLS working):', usersError.message);
    } else {
      console.log(`  ⚠️  Users query succeeded with anon key: ${users?.length || 0} users`);
      if (users && users.length > 0) {
        console.log('    📋 Sample users:', users.map(u => `ID: ${u.id}, Email: ${u.email}`));
      }
    }
  } catch (error) {
    console.log('  ✅ Users access blocked (RLS working):', error.message);
  }
  
  try {
    const { data: templates, error: templatesError } = await supabaseAnon
      .from('quick_reply_templates')
      .select('id, name, user_id')
      .limit(5);
    
    if (templatesError) {
      console.log('  ✅ Templates query failed with anon key (RLS working):', templatesError.message);
    } else {
      console.log(`  ⚠️  Templates query succeeded with anon key: ${templates?.length || 0} templates`);
      if (templates && templates.length > 0) {
        console.log('    📋 Sample templates:', templates.map(t => `ID: ${t.id}, Name: ${t.name}, User: ${t.user_id}`));
      }
    }
  } catch (error) {
    console.log('  ✅ Templates access blocked (RLS working):', error.message);
  }
  
  // 4. Check if there are any users in the database
  console.log('\n👥 Step 4: Checking user data with admin access...');
  
  try {
    const { data: allUsers, error: allUsersError } = await supabaseAdmin
      .from('users')
      .select('id, email, created_at')
      .limit(10);
    
    if (allUsersError) {
      console.log('  ❌ Failed to fetch users with admin key:', allUsersError.message);
    } else {
      console.log(`  📊 Total users in database: ${allUsers?.length || 0}`);
      if (allUsers && allUsers.length > 0) {
        console.log('    📋 Users:', allUsers.map(u => `ID: ${u.id}, Email: ${u.email}`));
      }
    }
  } catch (error) {
    console.log('  ❌ Error fetching users:', error.message);
  }
  
  try {
    const { data: allProducts, error: allProductsError } = await supabaseAdmin
      .from('products')
      .select('id, name, user_id')
      .limit(10);
    
    if (allProductsError) {
      console.log('  ❌ Failed to fetch products with admin key:', allProductsError.message);
    } else {
      console.log(`  📊 Total products in database: ${allProducts?.length || 0}`);
      if (allProducts && allProducts.length > 0) {
        console.log('    📋 Products by user:');
        const productsByUser = {};
        allProducts.forEach(p => {
          if (!productsByUser[p.user_id]) productsByUser[p.user_id] = [];
          productsByUser[p.user_id].push(p.name);
        });
        Object.entries(productsByUser).forEach(([userId, products]) => {
          console.log(`      User ${userId}: ${products.length} products (${products.slice(0, 3).join(', ')}${products.length > 3 ? '...' : ''})`);
        });
      }
    }
  } catch (error) {
    console.log('  ❌ Error fetching products:', error.message);
  }
  
  console.log('\n💡 Recommendations:');
  console.log('1. 🔄 Log out and log back in to refresh authentication token');
  console.log('2. 🧹 Clear browser cache and local storage');
  console.log('3. 🔍 Check browser developer tools for any authentication errors');
  console.log('4. 🔑 Verify that the application is using the correct user authentication');
  
  console.log('\n🎯 If you are still seeing other sellers\' data after logging out/in:');
  console.log('   - The application might be using service role key instead of user authentication');
  console.log('   - Check the frontend code to ensure it\'s using auth.uid() properly');
  console.log('   - Verify that queries include proper user filtering');
}

verifyRLSAndAuth().catch(console.error);