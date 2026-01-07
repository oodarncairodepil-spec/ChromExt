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

async function fixTemplatesRLSDirect() {
  console.log('🔧 Fixing Templates RLS using direct approach...');
  
  try {
    // First, let's check if the table exists and has data
    console.log('\n1. Checking templates table...');
    const { data: templates, error: templatesError } = await supabase
      .from('quick_reply_templates')
      .select('id, title, user_id')
      .limit(5);
    
    if (templatesError) {
      console.error('❌ Error accessing templates:', templatesError);
      return;
    }
    
    console.log('📋 Found', templates?.length || 0, 'templates');
    if (templates && templates.length > 0) {
      console.log('📋 Sample templates:', templates.map(t => ({ id: t.id, title: t.title, user_id: t.user_id })));
    }
    
    // The issue might be that RLS is not properly enabled or policies are not working
    // Let's try to recreate the table with proper RLS from scratch
    console.log('\n2. Attempting to fix RLS by recreating policies...');
    
    // Since we can't execute DDL directly, let's try a different approach
    // We'll create a new table with proper RLS and migrate data
    
    console.log('\n⚠️ Direct RLS fix via JavaScript client is limited.');
    console.log('\n📝 Manual SQL commands needed in Supabase Dashboard:');
    console.log('\n-- 1. Enable RLS on templates table');
    console.log('ALTER TABLE quick_reply_templates ENABLE ROW LEVEL SECURITY;');
    console.log('\n-- 2. Drop existing policies');
    console.log('DROP POLICY IF EXISTS "Users can view their own templates" ON quick_reply_templates;');
    console.log('DROP POLICY IF EXISTS "Users can insert their own templates" ON quick_reply_templates;');
    console.log('DROP POLICY IF EXISTS "Users can update their own templates" ON quick_reply_templates;');
    console.log('DROP POLICY IF EXISTS "Users can delete their own templates" ON quick_reply_templates;');
    console.log('\n-- 3. Create new restrictive policies');
    console.log('CREATE POLICY "Users can view their own templates" ON quick_reply_templates FOR SELECT USING (auth.uid() = user_id);');
    console.log('CREATE POLICY "Users can insert their own templates" ON quick_reply_templates FOR INSERT WITH CHECK (auth.uid() = user_id);');
    console.log('CREATE POLICY "Users can update their own templates" ON quick_reply_templates FOR UPDATE USING (auth.uid() = user_id);');
    console.log('CREATE POLICY "Users can delete their own templates" ON quick_reply_templates FOR DELETE USING (auth.uid() = user_id);');
    console.log('\n-- 4. Make couriers globally accessible');
    console.log('ALTER TABLE shipping_couriers ENABLE ROW LEVEL SECURITY;');
    console.log('DROP POLICY IF EXISTS "shipping_couriers_read_policy" ON shipping_couriers;');
    console.log('CREATE POLICY "All users can view couriers" ON shipping_couriers FOR SELECT USING (true);');
    console.log('\nALTER TABLE courier_services ENABLE ROW LEVEL SECURITY;');
    console.log('DROP POLICY IF EXISTS "courier_services_read_policy" ON courier_services;');
    console.log('CREATE POLICY "All users can view courier services" ON courier_services FOR SELECT USING (true);');
    
    // Test with anonymous client
    console.log('\n3. Testing current state with anonymous client...');
    const anonClient = createClient(supabaseUrl, process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: anonTemplates, error: anonError } = await anonClient
      .from('quick_reply_templates')
      .select('id, title, user_id')
      .limit(3);
    
    if (anonError) {
      console.log('✅ Templates RLS is working - anonymous access blocked:', anonError.message);
    } else {
      console.log('❌ Templates RLS is NOT working - anonymous access succeeded:', anonTemplates?.length || 0, 'templates visible');
      console.log('🔧 This confirms that RLS policies need to be manually applied in Supabase Dashboard');
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Copy and paste the SQL commands shown above');
    console.log('3. Execute them one by one');
    console.log('4. Refresh your browser application');
    console.log('5. Test that templates are properly isolated');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixTemplatesRLSDirect().catch(console.error);