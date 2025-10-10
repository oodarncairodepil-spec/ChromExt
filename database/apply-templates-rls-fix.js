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

async function applyTemplatesRLSFix() {
  console.log('🔧 Applying Templates RLS Fix...');
  
  try {
    // Execute SQL commands using rpc function
    console.log('\n1. Enabling RLS on quick_reply_templates...');
    const { data: enableRLS, error: enableError } = await supabase
      .rpc('exec_sql', { 
        sql_query: 'ALTER TABLE quick_reply_templates ENABLE ROW LEVEL SECURITY;' 
      });
    
    if (enableError) {
      console.log('⚠️ Enable RLS result:', enableError);
    } else {
      console.log('✅ RLS enabled successfully');
    }
    
    console.log('\n2. Dropping existing policies...');
    const policies = [
      'Users can view their own templates',
      'Users can insert their own templates', 
      'Users can update their own templates',
      'Users can delete their own templates'
    ];
    
    for (const policy of policies) {
      const { data, error } = await supabase
        .rpc('exec_sql', { 
          sql_query: `DROP POLICY IF EXISTS "${policy}" ON quick_reply_templates;` 
        });
      
      if (error) {
        console.log(`⚠️ Drop policy "${policy}":`, error.message);
      } else {
        console.log(`✅ Dropped policy: "${policy}"`);
      }
    }
    
    console.log('\n3. Creating new restrictive policies...');
    const newPolicies = [
      {
        name: 'Users can view their own templates',
        sql: 'CREATE POLICY "Users can view their own templates" ON quick_reply_templates FOR SELECT USING (auth.uid() = user_id);'
      },
      {
        name: 'Users can insert their own templates',
        sql: 'CREATE POLICY "Users can insert their own templates" ON quick_reply_templates FOR INSERT WITH CHECK (auth.uid() = user_id);'
      },
      {
        name: 'Users can update their own templates', 
        sql: 'CREATE POLICY "Users can update their own templates" ON quick_reply_templates FOR UPDATE USING (auth.uid() = user_id);'
      },
      {
        name: 'Users can delete their own templates',
        sql: 'CREATE POLICY "Users can delete their own templates" ON quick_reply_templates FOR DELETE USING (auth.uid() = user_id);'
      }
    ];
    
    for (const policy of newPolicies) {
      const { data, error } = await supabase
        .rpc('exec_sql', { sql_query: policy.sql });
      
      if (error) {
        console.log(`❌ Create policy "${policy.name}":`, error.message);
      } else {
        console.log(`✅ Created policy: "${policy.name}"`);
      }
    }
    
    console.log('\n4. Testing the fix with anonymous client...');
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
    
    console.log('\n🎉 Templates RLS fix completed!');
    console.log('\n🔄 Please refresh your browser to see the changes.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

applyTemplatesRLSFix().catch(console.error);