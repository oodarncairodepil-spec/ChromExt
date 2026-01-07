require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.log('Required env vars:');
  console.log('- PLASMO_PUBLIC_SUPABASE_URL');
  console.log('- PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSQL(query, description) {
  console.log(`\n🔧 ${description}`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query });
    if (error) {
      console.error(`❌ Error: ${error.message}`);
      return false;
    }
    console.log('✅ Success');
    return true;
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function createExecFunction() {
  const createFunctionSQL = `
CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
  RETURN 'Success';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;
  `;
  
  return await executeSQL(createFunctionSQL, 'Creating exec_sql function');
}

async function fixTemplateRLS() {
  const queries = [
    // Enable RLS on templates
    'ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;',
    
    // Drop all existing policies
    'DROP POLICY IF EXISTS "Users can only see own templates" ON public.quick_reply_templates;',
    'DROP POLICY IF EXISTS "Users can only insert own templates" ON public.quick_reply_templates;',
    'DROP POLICY IF EXISTS "Users can only update own templates" ON public.quick_reply_templates;',
    'DROP POLICY IF EXISTS "Users can only delete own templates" ON public.quick_reply_templates;',
    'DROP POLICY IF EXISTS "Enable read access for all users" ON public.quick_reply_templates;',
    'DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.quick_reply_templates;',
    'DROP POLICY IF EXISTS "Enable update for users based on email" ON public.quick_reply_templates;',
    'DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.quick_reply_templates;',
    
    // Create restrictive policies
    'CREATE POLICY "Users can only see own templates" ON public.quick_reply_templates FOR SELECT USING (auth.uid() = user_id);',
    'CREATE POLICY "Users can only insert own templates" ON public.quick_reply_templates FOR INSERT WITH CHECK (auth.uid() = user_id);',
    'CREATE POLICY "Users can only update own templates" ON public.quick_reply_templates FOR UPDATE USING (auth.uid() = user_id);',
    'CREATE POLICY "Users can only delete own templates" ON public.quick_reply_templates FOR DELETE USING (auth.uid() = user_id);'
  ];
  
  for (const query of queries) {
    await executeSQL(query, `Executing: ${query.substring(0, 50)}...`);
  }
}

async function fixAllUserDataRLS() {
  const tables = [
    { name: 'products', column: 'user_id' },
    { name: 'orders', column: 'buyer_id' },
    { name: 'users', column: 'id' },
    { name: 'payment_methods', column: 'user_id' },
    { name: 'user_courier_preferences', column: 'user_id' },
    { name: 'user_service_preferences', column: 'user_id' }
  ];
  
  for (const table of tables) {
    console.log(`\n📋 Processing ${table.name} table...`);
    
    // Enable RLS
    await executeSQL(`ALTER TABLE public.${table.name} ENABLE ROW LEVEL SECURITY;`, `Enabling RLS on ${table.name}`);
    
    // Drop existing policies
    const policyNames = [
      `Users can only see own ${table.name.replace('_', ' ')}`,
      `Users can only insert own ${table.name.replace('_', ' ')}`,
      `Users can only update own ${table.name.replace('_', ' ')}`,
      `Users can only delete own ${table.name.replace('_', ' ')}`
    ];
    
    for (const policyName of policyNames) {
      await executeSQL(`DROP POLICY IF EXISTS "${policyName}" ON public.${table.name};`, `Dropping policy: ${policyName}`);
    }
    
    // Create new restrictive policies
    const authCondition = table.column === 'id' ? 'auth.uid() = id' : `auth.uid() = ${table.column}`;
    
    await executeSQL(
      `CREATE POLICY "Users can only see own ${table.name.replace('_', ' ')}" ON public.${table.name} FOR SELECT USING (${authCondition});`,
      `Creating SELECT policy for ${table.name}`
    );
    
    if (table.name !== 'users') { // Users table typically doesn't allow INSERT
      await executeSQL(
        `CREATE POLICY "Users can only insert own ${table.name.replace('_', ' ')}" ON public.${table.name} FOR INSERT WITH CHECK (${authCondition});`,
        `Creating INSERT policy for ${table.name}`
      );
    }
    
    await executeSQL(
      `CREATE POLICY "Users can only update own ${table.name.replace('_', ' ')}" ON public.${table.name} FOR UPDATE USING (${authCondition});`,
      `Creating UPDATE policy for ${table.name}`
    );
    
    if (table.name !== 'users') { // Users table typically doesn't allow DELETE
      await executeSQL(
        `CREATE POLICY "Users can only delete own ${table.name.replace('_', ' ')}" ON public.${table.name} FOR DELETE USING (${authCondition});`,
        `Creating DELETE policy for ${table.name}`
      );
    }
  }
}

async function fixGlobalDataRLS() {
  const globalTables = ['shipping_couriers', 'courier_services'];
  
  for (const table of globalTables) {
    console.log(`\n🌍 Processing global table ${table}...`);
    
    // Enable RLS
    await executeSQL(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`, `Enabling RLS on ${table}`);
    
    // Drop existing policies
    await executeSQL(`DROP POLICY IF EXISTS "Allow all users to read ${table.replace('_', ' ')}" ON public.${table};`, `Dropping existing policy`);
    
    // Create permissive policy
    await executeSQL(
      `CREATE POLICY "Allow all users to read ${table.replace('_', ' ')}" ON public.${table} FOR SELECT USING (true);`,
      `Creating permissive policy for ${table}`
    );
  }
}

async function testRLSFix() {
  console.log('\n🧪 Testing RLS fix...');
  
  // Test with anonymous client
  const anonClient = createClient(supabaseUrl, process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY);
  
  try {
    const { data: templates, error } = await anonClient
      .from('quick_reply_templates')
      .select('*');
    
    if (error) {
      console.log('✅ Templates properly restricted (error expected)');
    } else {
      console.log(`❌ Templates still accessible: ${templates?.length || 0} records`);
    }
  } catch (err) {
    console.log('✅ Templates properly restricted (exception expected)');
  }
  
  // Test global data
  try {
    const { data: couriers } = await anonClient
      .from('shipping_couriers')
      .select('*');
    
    console.log(`✅ Couriers accessible: ${couriers?.length || 0} records`);
  } catch (err) {
    console.log('❌ Couriers not accessible (should be accessible)');
  }
}

async function main() {
  console.log('=== DIRECT RLS FIX - FINAL ATTEMPT ===');
  
  // Step 1: Create exec function
  const funcCreated = await createExecFunction();
  if (!funcCreated) {
    console.log('\n⚠️  exec_sql function creation failed, but continuing...');
  }
  
  // Step 2: Fix template RLS (most critical)
  console.log('\n🎯 FIXING TEMPLATE RLS (CRITICAL)');
  await fixTemplateRLS();
  
  // Step 3: Fix all user data RLS
  console.log('\n👤 FIXING USER DATA RLS');
  await fixAllUserDataRLS();
  
  // Step 4: Fix global data RLS
  console.log('\n🌍 FIXING GLOBAL DATA RLS');
  await fixGlobalDataRLS();
  
  // Step 5: Test the fix
  await testRLSFix();
  
  console.log('\n=== RLS FIX COMPLETED ===');
  console.log('\n📋 Next steps:');
  console.log('1. Run: node scripts/database/verify-rls-fix.js');
  console.log('2. Test in your application');
  console.log('3. Check that you can only see your own templates');
}

main().catch(console.error);