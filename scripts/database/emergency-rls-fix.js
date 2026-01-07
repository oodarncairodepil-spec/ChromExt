require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeDirectSQL(query, description) {
  console.log(`\n🔧 ${description}`);
  try {
    // Try direct query execution
    const { data, error } = await supabase.rpc('query', { query });
    if (error) {
      console.error(`❌ RPC Error: ${error.message}`);
      
      // Try alternative approach with from().select()
      try {
        const result = await supabase.from('_').select('*').limit(0);
        console.log('⚠️  Trying alternative SQL execution method...');
        return false;
      } catch (altErr) {
        console.error(`❌ Alternative method failed: ${altErr.message}`);
        return false;
      }
    }
    console.log('✅ Success');
    return true;
  } catch (err) {
    console.error(`❌ Exception: ${err.message}`);
    return false;
  }
}

async function disableRLSTemporarily() {
  console.log('\n🚨 EMERGENCY: Attempting to disable RLS temporarily on templates');
  
  try {
    // Try to disable RLS entirely on templates as emergency measure
    const { error } = await supabase
      .from('quick_reply_templates')
      .select('*')
      .limit(0);
    
    if (error) {
      console.log('✅ Templates are properly restricted (this is good!)');
      return true;
    } else {
      console.log('❌ Templates are still accessible - RLS not working');
      return false;
    }
  } catch (err) {
    console.log('✅ Templates access blocked (this is good!)');
    return true;
  }
}

async function testCurrentRLSStatus() {
  console.log('\n🔍 TESTING CURRENT RLS STATUS');
  
  // Test with anonymous client
  const anonClient = createClient(supabaseUrl, process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY);
  
  const tables = [
    'quick_reply_templates',
    'products',
    'orders',
    'users',
    'payment_methods',
    'shipping_couriers',
    'courier_services'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await anonClient
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`✅ ${table}: RESTRICTED (${error.message})`);
      } else {
        console.log(`❌ ${table}: ACCESSIBLE (${data?.length || 0} records)`);
      }
    } catch (err) {
      console.log(`✅ ${table}: RESTRICTED (exception: ${err.message})`);
    }
  }
}

async function createManualSQLCommands() {
  console.log('\n📝 GENERATING MANUAL SQL COMMANDS');
  console.log('\n=== COPY AND PASTE THESE COMMANDS INTO SUPABASE SQL EDITOR ===');
  
  const sqlCommands = `
-- EMERGENCY RLS FIX FOR TEMPLATES
-- Execute these commands ONE BY ONE in Supabase Dashboard SQL Editor

-- 1. DISABLE RLS temporarily to clear all policies
ALTER TABLE public.quick_reply_templates DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies (run each separately)
DROP POLICY IF EXISTS "Users can only see own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only insert own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only update own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Users can only delete own templates" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.quick_reply_templates;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.quick_reply_templates;

-- 3. RE-ENABLE RLS
ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;

-- 4. Create NEW restrictive policies (run each separately)
CREATE POLICY "template_select_own" ON public.quick_reply_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "template_insert_own" ON public.quick_reply_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "template_update_own" ON public.quick_reply_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "template_delete_own" ON public.quick_reply_templates
  FOR DELETE USING (auth.uid() = user_id);

-- 5. VERIFY (this should return 0 when not authenticated)
SELECT COUNT(*) FROM quick_reply_templates;
  `;
  
  console.log(sqlCommands);
  
  // Write to file for easy access
  const fs = require('fs');
  fs.writeFileSync('/Users/plugoemployee/ChromExt/supabase/migrations/EMERGENCY-SQL-FIX.sql', sqlCommands);
  console.log('\n📄 Commands saved to: supabase/migrations/EMERGENCY-SQL-FIX.sql');
}

async function main() {
  console.log('=== EMERGENCY RLS DIAGNOSTIC AND FIX ===');
  
  // Test current status
  await testCurrentRLSStatus();
  
  // Generate manual commands
  await createManualSQLCommands();
  
  console.log('\n🚨 CRITICAL NEXT STEPS:');
  console.log('1. Open Supabase Dashboard > SQL Editor');
  console.log('2. Copy commands from supabase/migrations/EMERGENCY-SQL-FIX.sql');
  console.log('3. Execute each command ONE BY ONE');
  console.log('4. Run: node scripts/database/verify-rls-fix.js');
  console.log('\n⚠️  The issue is that RLS policies are not being applied correctly.');
  console.log('   Manual execution in Supabase Dashboard is the most reliable method.');
}

main().catch(console.error);