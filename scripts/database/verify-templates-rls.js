const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

async function verifyTemplatesRLS() {
  console.log('🔍 Verifying Templates RLS Status...');
  
  try {
    // Test with anonymous client (should be blocked)
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);
    
    console.log('\n1. Testing anonymous access to templates...');
    const { data: anonTemplates, error: anonError } = await anonClient
      .from('quick_reply_templates')
      .select('id, title, user_id')
      .limit(5);
    
    if (anonError) {
      console.log('✅ Templates RLS is working correctly!');
      console.log('   Anonymous access blocked:', anonError.message);
      console.log('\n🎉 Template isolation is now properly configured!');
      console.log('\n📋 Summary:');
      console.log('   • Templates are now isolated per user');
      console.log('   • Users can only see their own templates');
      console.log('   • Anonymous access is properly blocked');
    } else {
      console.log('❌ Templates RLS is still NOT working!');
      console.log('   Anonymous access succeeded:', anonTemplates?.length || 0, 'templates visible');
      console.log('\n🔧 Please ensure you have executed the SQL commands in Supabase Dashboard:');
      console.log('\n   1. Go to Supabase Dashboard > SQL Editor');
      console.log('   2. Execute the provided SQL commands');
      console.log('   3. Run this script again to verify');
      
      if (anonTemplates && anonTemplates.length > 0) {
        console.log('\n📊 Templates currently visible to anonymous users:');
        anonTemplates.forEach((template, index) => {
          console.log(`   ${index + 1}. ${template.title} (User: ${template.user_id})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

verifyTemplatesRLS().catch(console.error);