const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkColumns() {
  try {
    console.log('Checking variant_options table columns...');
    
    // Query information_schema for variant_options columns
    const { data: voColumns, error: voError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'variant_options')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    if (voError) {
      console.error('Error getting variant_options columns:', voError);
    } else {
      console.log('variant_options columns:', voColumns);
    }
    
    console.log('\nChecking product_variants table columns...');
    
    // Query information_schema for product_variants columns
    const { data: pvColumns, error: pvError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'product_variants')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    if (pvError) {
      console.error('Error getting product_variants columns:', pvError);
    } else {
      console.log('product_variants columns:', pvColumns);
    }
    
    // Also check if tables exist at all
    console.log('\nChecking if tables exist...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['variant_options', 'product_variants']);
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError);
    } else {
      console.log('Existing tables:', tables);
    }
    
  } catch (err) {
    console.error('Check error:', err);
  }
}

checkColumns();