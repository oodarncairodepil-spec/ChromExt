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

async function createIntegrationCredentialsTable() {
  console.log('🔧 Creating integration_credentials table...');
  
  try {
    // Create the table
    const { data, error } = await supabase
      .from('integration_credentials')
      .select('*')
      .limit(1);
    
    if (error && error.code === 'PGRST116') {
      // Table doesn't exist, let's create it using a raw SQL approach
      console.log('📋 Table does not exist, attempting to create...');
      
      // Since we can't use exec_sql, let's try to insert a test record to trigger table creation
      // This won't work, but let's try a different approach
      
      console.log('❌ Cannot create table directly through Supabase client.');
      console.log('📝 Please create the table manually in Supabase Dashboard:');
      console.log('');
      console.log('CREATE TABLE IF NOT EXISTS integration_credentials (');
      console.log('  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,');
      console.log('  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,');
      console.log('  vendor_id VARCHAR(255),');
      console.log('  api_key VARCHAR(255),');
      console.log('  partner_id VARCHAR(255),');
      console.log('  partner_pass VARCHAR(255),');
      console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),');
      console.log('  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
      console.log(');');
      console.log('');
      console.log('ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;');
      console.log('');
      console.log('CREATE POLICY "Users can manage their own credentials" ON integration_credentials');
      console.log('  FOR ALL USING (user_id = auth.uid());');
      console.log('');
      console.log('CREATE OR REPLACE FUNCTION update_integration_credentials_updated_at()');
      console.log('RETURNS TRIGGER AS $$');
      console.log('BEGIN');
      console.log('  NEW.updated_at = NOW();');
      console.log('  RETURN NEW;');
      console.log('END;');
      console.log('$$ LANGUAGE plpgsql;');
      console.log('');
      console.log('CREATE TRIGGER update_integration_credentials_updated_at');
      console.log('  BEFORE UPDATE ON integration_credentials');
      console.log('  FOR EACH ROW');
      console.log('  EXECUTE FUNCTION update_integration_credentials_updated_at();');
      
    } else if (error) {
      console.error('❌ Error checking table:', error);
    } else {
      console.log('✅ integration_credentials table already exists');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

createIntegrationCredentialsTable();