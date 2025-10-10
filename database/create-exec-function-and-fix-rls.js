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

async function createExecFunctionAndFixRLS() {
  console.log('🔧 Creating exec_sql function and fixing Templates RLS...');
  
  try {
    console.log('\n1. Creating exec_sql function...');
    
    // First, let's try to create the function using a direct SQL approach
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_query;
        RETURN 'Success';
      EXCEPTION
        WHEN OTHERS THEN
          RETURN SQLERRM;
      END;
      $$;
    `;
    
    // Try using the SQL editor approach via REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({ sql_query: createFunctionSQL })
    });
    
    if (!response.ok) {
      console.log('⚠️ Could not create function via REST API');
      console.log('\n📝 Manual steps required:');
      console.log('\n1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Execute this SQL to create the exec_sql function:');
      console.log('\n```sql');
      console.log(createFunctionSQL);
      console.log('```');
      console.log('\n3. Then execute these RLS commands:');
      console.log('\n```sql');
      console.log('-- Enable RLS');
      console.log('ALTER TABLE quick_reply_templates ENABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('-- Drop existing policies');
      console.log('DROP POLICY IF EXISTS "Users can view their own templates" ON quick_reply_templates;');
      console.log('DROP POLICY IF EXISTS "Users can insert their own templates" ON quick_reply_templates;');
      console.log('DROP POLICY IF EXISTS "Users can update their own templates" ON quick_reply_templates;');
      console.log('DROP POLICY IF EXISTS "Users can delete their own templates" ON quick_reply_templates;');
      console.log('');
      console.log('-- Create new restrictive policies');
      console.log('CREATE POLICY "Users can view their own templates" ON quick_reply_templates FOR SELECT USING (auth.uid() = user_id);');
      console.log('CREATE POLICY "Users can insert their own templates" ON quick_reply_templates FOR INSERT WITH CHECK (auth.uid() = user_id);');
      console.log('CREATE POLICY "Users can update their own templates" ON quick_reply_templates FOR UPDATE USING (auth.uid() = user_id);');
      console.log('CREATE POLICY "Users can delete their own templates" ON quick_reply_templates FOR DELETE USING (auth.uid() = user_id);');
      console.log('```');
      
      console.log('\n4. After executing the SQL commands, test with anonymous client...');
      const anonClient = createClient(supabaseUrl, process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY);
      
      const { data: anonTemplates, error: anonError } = await anonClient
        .from('quick_reply_templates')
        .select('id, title, user_id')
        .limit(3);
      
      if (anonError) {
        console.log('\n✅ Templates RLS might be working - anonymous access blocked:', anonError.message);
      } else {
        console.log('\n❌ Templates RLS still not working - anonymous access succeeded:', anonTemplates?.length || 0, 'templates visible');
        console.log('\n🔧 You MUST execute the SQL commands in Supabase Dashboard to fix this issue.');
      }
      
      return;
    }
    
    console.log('✅ Function created successfully');
    
    // Now try to apply RLS policies
    console.log('\n2. Applying RLS policies...');
    
    const { data: enableRLS, error: enableError } = await supabase
      .rpc('exec_sql', { 
        sql_query: 'ALTER TABLE quick_reply_templates ENABLE ROW LEVEL SECURITY;' 
      });
    
    if (enableError) {
      console.log('⚠️ Enable RLS error:', enableError);
    } else {
      console.log('✅ RLS enabled');
    }
    
    // Apply policies
    const policies = [
      'DROP POLICY IF EXISTS "Users can view their own templates" ON quick_reply_templates;',
      'DROP POLICY IF EXISTS "Users can insert their own templates" ON quick_reply_templates;',
      'DROP POLICY IF EXISTS "Users can update their own templates" ON quick_reply_templates;',
      'DROP POLICY IF EXISTS "Users can delete their own templates" ON quick_reply_templates;',
      'CREATE POLICY "Users can view their own templates" ON quick_reply_templates FOR SELECT USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can insert their own templates" ON quick_reply_templates FOR INSERT WITH CHECK (auth.uid() = user_id);',
      'CREATE POLICY "Users can update their own templates" ON quick_reply_templates FOR UPDATE USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can delete their own templates" ON quick_reply_templates FOR DELETE USING (auth.uid() = user_id);'
    ];
    
    for (const policy of policies) {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: policy });
      if (error) {
        console.log('⚠️ Policy error:', error.message);
      } else {
        console.log('✅ Policy applied:', policy.substring(0, 50) + '...');
      }
    }
    
    console.log('\n3. Testing the fix...');
    const anonClient = createClient(supabaseUrl, process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: anonTemplates, error: anonError } = await anonClient
      .from('quick_reply_templates')
      .select('id, title, user_id')
      .limit(3);
    
    if (anonError) {
      console.log('✅ Templates RLS is now working - anonymous access blocked:', anonError.message);
    } else {
      console.log('❌ Templates RLS still not working - anonymous access succeeded:', anonTemplates?.length || 0, 'templates visible');
    }
    
    console.log('\n🎉 RLS fix process completed!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createExecFunctionAndFixRLS().catch(console.error);