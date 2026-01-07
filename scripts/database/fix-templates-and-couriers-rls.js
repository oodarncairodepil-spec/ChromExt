const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSQL(sql, description) {
  console.log(`🔧 ${description}...`);
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql })
    });
    
    if (!response.ok) {
      // Try direct SQL execution via REST API
      const directResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sql',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: sql
      });
      
      if (!directResponse.ok) {
        console.log(`⚠️ Could not execute via REST API: ${description}`);
        console.log(`📝 SQL to execute manually: ${sql}`);
        return false;
      }
    }
    
    console.log(`✅ ${description} completed`);
    return true;
  } catch (error) {
    console.log(`⚠️ Error with ${description}:`, error.message);
    console.log(`📝 SQL to execute manually: ${sql}`);
    return false;
  }
}

async function fixTemplatesAndCouriersRLS() {
  console.log('🔧 Fixing Templates and Couriers RLS Policies...');
  
  // 1. Fix Templates RLS - Enable RLS and create proper policies
  console.log('\n1. Fixing Templates (quick_reply_templates) RLS...');
  
  await executeSQL(
    'ALTER TABLE quick_reply_templates ENABLE ROW LEVEL SECURITY;',
    'Enabling RLS on quick_reply_templates'
  );
  
  await executeSQL(
    'DROP POLICY IF EXISTS "Users can view their own templates" ON quick_reply_templates;',
    'Dropping existing templates view policy'
  );
  
  await executeSQL(
    'CREATE POLICY "Users can view their own templates" ON quick_reply_templates FOR SELECT USING (auth.uid() = user_id);',
    'Creating templates view policy'
  );
  
  await executeSQL(
    'DROP POLICY IF EXISTS "Users can insert their own templates" ON quick_reply_templates;',
    'Dropping existing templates insert policy'
  );
  
  await executeSQL(
    'CREATE POLICY "Users can insert their own templates" ON quick_reply_templates FOR INSERT WITH CHECK (auth.uid() = user_id);',
    'Creating templates insert policy'
  );
  
  await executeSQL(
    'DROP POLICY IF EXISTS "Users can update their own templates" ON quick_reply_templates;',
    'Dropping existing templates update policy'
  );
  
  await executeSQL(
    'CREATE POLICY "Users can update their own templates" ON quick_reply_templates FOR UPDATE USING (auth.uid() = user_id);',
    'Creating templates update policy'
  );
  
  await executeSQL(
    'DROP POLICY IF EXISTS "Users can delete their own templates" ON quick_reply_templates;',
    'Dropping existing templates delete policy'
  );
  
  await executeSQL(
    'CREATE POLICY "Users can delete their own templates" ON quick_reply_templates FOR DELETE USING (auth.uid() = user_id);',
    'Creating templates delete policy'
  );
  
  // 2. Make Shipping Couriers globally accessible
  console.log('\n2. Making Shipping Couriers globally accessible...');
  
  await executeSQL(
    'ALTER TABLE shipping_couriers ENABLE ROW LEVEL SECURITY;',
    'Enabling RLS on shipping_couriers'
  );
  
  await executeSQL(
    'DROP POLICY IF EXISTS "shipping_couriers_read_policy" ON shipping_couriers;',
    'Dropping existing couriers read policy'
  );
  
  await executeSQL(
    'CREATE POLICY "All users can view couriers" ON shipping_couriers FOR SELECT USING (true);',
    'Creating global couriers read policy'
  );
  
  await executeSQL(
    'ALTER TABLE courier_services ENABLE ROW LEVEL SECURITY;',
    'Enabling RLS on courier_services'
  );
  
  await executeSQL(
    'DROP POLICY IF EXISTS "courier_services_read_policy" ON courier_services;',
    'Dropping existing courier services read policy'
  );
  
  await executeSQL(
    'CREATE POLICY "All users can view courier services" ON courier_services FOR SELECT USING (true);',
    'Creating global courier services read policy'
  );
  
  // 3. Test the fixes
  console.log('\n3. Testing the fixes...');
  
  // Test templates with anonymous key
  const anonClient = createClient(supabaseUrl, process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY);
  
  console.log('🧪 Testing templates access with anonymous key...');
  const { data: anonTemplates, error: anonTemplatesError } = await anonClient
    .from('quick_reply_templates')
    .select('id, title, user_id')
    .limit(3);
  
  if (anonTemplatesError) {
    console.log('✅ Templates RLS working - anonymous access blocked:', anonTemplatesError.message);
  } else {
    console.log('❌ Templates RLS not working - anonymous access succeeded:', anonTemplates?.length || 0, 'templates found');
  }
  
  // Test couriers with anonymous key
  console.log('🧪 Testing couriers access with anonymous key...');
  const { data: anonCouriers, error: anonCouriersError } = await anonClient
    .from('shipping_couriers')
    .select('id, name, code')
    .limit(3);
  
  if (anonCouriersError) {
    console.log('❌ Couriers not globally accessible:', anonCouriersError.message);
  } else {
    console.log('✅ Couriers globally accessible:', anonCouriers?.length || 0, 'couriers found');
  }
  
  console.log('\n🎉 Templates and Couriers RLS fix completed!');
  console.log('\n📋 Summary:');
  console.log('  - Templates: Should only be visible to their owners');
  console.log('  - Couriers: Should be visible to all authenticated users');
  console.log('\n🔄 Please refresh your browser to see the changes.');
}

fixTemplatesAndCouriersRLS().catch(console.error);