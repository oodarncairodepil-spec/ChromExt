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

async function debugTemplatesAndCouriers() {
  console.log('🔍 Debugging Templates and Couriers RLS...');
  
  try {
    // 1. Check RLS status for templates table
    console.log('\n1. Checking RLS status for quick_reply_templates...');
    const { data: templatesRLS, error: templatesRLSError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'quick_reply_templates');
    
    if (templatesRLSError) {
      console.error('❌ Error checking templates RLS:', templatesRLSError);
    } else {
      console.log('📋 Templates RLS status:', templatesRLS);
    }
    
    // 2. Check current policies for templates
    console.log('\n2. Checking current policies for quick_reply_templates...');
    const { data: templatesPolicies, error: templatesPoliciesError } = await supabase
      .rpc('exec_sql', { 
        sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
              FROM pg_policies 
              WHERE tablename = 'quick_reply_templates';`
      });
    
    if (templatesPoliciesError) {
      console.error('❌ Error checking templates policies:', templatesPoliciesError);
      // Try alternative approach
      console.log('🔄 Trying alternative approach...');
      const { data: altPolicies, error: altError } = await supabase
        .from('information_schema.table_privileges')
        .select('*')
        .eq('table_name', 'quick_reply_templates');
      
      if (altError) {
        console.error('❌ Alternative approach failed:', altError);
      } else {
        console.log('📋 Templates privileges:', altPolicies);
      }
    } else {
      console.log('📋 Templates policies:', templatesPolicies);
    }
    
    // 3. Test templates access with anonymous key
    console.log('\n3. Testing templates access with anonymous key...');
    const anonClient = createClient(supabaseUrl, process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: anonTemplates, error: anonTemplatesError } = await anonClient
      .from('quick_reply_templates')
      .select('id, title, user_id')
      .limit(5);
    
    if (anonTemplatesError) {
      console.log('✅ Anonymous access to templates blocked:', anonTemplatesError.message);
    } else {
      console.log('⚠️ Anonymous access to templates succeeded:', anonTemplates?.length || 0, 'templates found');
      if (anonTemplates && anonTemplates.length > 0) {
        console.log('📋 Sample templates:', anonTemplates.map(t => ({ id: t.id, title: t.title, user_id: t.user_id })));
      }
    }
    
    // 4. Check RLS status for shipping couriers
    console.log('\n4. Checking RLS status for shipping_couriers...');
    const { data: couriersRLS, error: couriersRLSError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'shipping_couriers');
    
    if (couriersRLSError) {
      console.error('❌ Error checking couriers RLS:', couriersRLSError);
    } else {
      console.log('📋 Couriers RLS status:', couriersRLS);
    }
    
    // 5. Test couriers access with anonymous key
    console.log('\n5. Testing couriers access with anonymous key...');
    const { data: anonCouriers, error: anonCouriersError } = await anonClient
      .from('shipping_couriers')
      .select('id, name, code')
      .limit(5);
    
    if (anonCouriersError) {
      console.log('❌ Anonymous access to couriers blocked:', anonCouriersError.message);
    } else {
      console.log('✅ Anonymous access to couriers succeeded:', anonCouriers?.length || 0, 'couriers found');
      if (anonCouriers && anonCouriers.length > 0) {
        console.log('📋 Sample couriers:', anonCouriers.map(c => ({ id: c.id, name: c.name, code: c.code })));
      }
    }
    
    // 6. Count total templates and check user distribution
    console.log('\n6. Checking templates distribution by user...');
    const { data: templatesCount, error: templatesCountError } = await supabase
      .from('quick_reply_templates')
      .select('user_id')
      .limit(100);
    
    if (templatesCountError) {
      console.error('❌ Error counting templates:', templatesCountError);
    } else {
      const userCounts = {};
      templatesCount?.forEach(t => {
        userCounts[t.user_id] = (userCounts[t.user_id] || 0) + 1;
      });
      console.log('📊 Templates by user:', userCounts);
      console.log('📊 Total templates:', templatesCount?.length || 0);
      console.log('📊 Unique users with templates:', Object.keys(userCounts).length);
    }
    
    console.log('\n✅ Debug complete!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugTemplatesAndCouriers().catch(console.error);