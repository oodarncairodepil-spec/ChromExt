const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read Supabase credentials from run-setup-script.js
const setupScript = fs.readFileSync('./scripts/database/run-setup-script.js', 'utf8');
const supabaseUrlMatch = setupScript.match(/const supabaseUrl = '([^']+)'/);
const supabaseKeyMatch = setupScript.match(/const supabaseKey = '([^']+)'/);

if (!supabaseUrlMatch || !supabaseKeyMatch) {
  console.error('Could not extract Supabase credentials from run-setup-script.js');
  process.exit(1);
}

const supabaseUrl = supabaseUrlMatch[1];
const supabaseKey = supabaseKeyMatch[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductVariantsSchema() {
  try {
    console.log('Checking product_variants table schema...');
    
    // Query to get column information for product_variants table
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'product_variants' 
          AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      console.error('Error querying schema:', error);
      
      // Try alternative approach using direct query
      console.log('Trying alternative approach...');
      const { data: altData, error: altError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'product_variants')
        .eq('table_schema', 'public')
        .order('ordinal_position');
        
      if (altError) {
        console.error('Alternative approach also failed:', altError);
        
        // Try simple table existence check
        console.log('Checking if product_variants table exists...');
        const { data: tableData, error: tableError } = await supabase
          .from('product_variants')
          .select('*')
          .limit(1);
          
        if (tableError) {
          console.error('Table check failed:', tableError);
        } else {
          console.log('Table exists but schema query failed');
        }
        return;
      }
      
      console.log('Product variants table columns:');
      altData.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
      
      // Check specifically for sku_suffix
      const hasSkuSuffix = altData.some(col => col.column_name === 'sku_suffix');
      console.log(`\nsku_suffix column exists: ${hasSkuSuffix}`);
      
      return;
    }

    console.log('Product variants table columns:');
    data.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check specifically for sku_suffix
    const hasSkuSuffix = data.some(col => col.column_name === 'sku_suffix');
    console.log(`\nsku_suffix column exists: ${hasSkuSuffix}`);
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkProductVariantsSchema();