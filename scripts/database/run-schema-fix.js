const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSchemaFix() {
  try {
    console.log('Dropping existing tables if they exist...');
    
    // Drop existing tables
    const dropQueries = [
      'DROP TABLE IF EXISTS variant_options CASCADE;',
      'DROP TABLE IF EXISTS product_variants CASCADE;'
    ];
    
    for (const query of dropQueries) {
      console.log('Executing:', query);
      const { error } = await supabase.rpc('exec', { sql: query });
      if (error) {
        console.log('Drop error (expected if table doesn\'t exist):', error.message);
      }
    }
    
    console.log('\nCreating product_variants table...');
    const createProductVariants = `
      CREATE TABLE product_variants (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        
        variant_tier_1_value VARCHAR(255),
        variant_tier_2_value VARCHAR(255),
        variant_tier_3_value VARCHAR(255),
        
        full_product_name VARCHAR(500) NOT NULL,
        
        image_url TEXT,
        weight DECIMAL(8,3),
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        sku_suffix VARCHAR(100),
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: pvError } = await supabase.rpc('exec', { sql: createProductVariants });
    if (pvError) {
      console.error('Error creating product_variants:', pvError);
    } else {
      console.log('product_variants table created successfully');
    }
    
    console.log('\nCreating variant_options table...');
    const createVariantOptions = `
      CREATE TABLE variant_options (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        
        tier_level INTEGER NOT NULL CHECK (tier_level IN (1, 2, 3)),
        tier_name VARCHAR(100) NOT NULL,
        
        option_value VARCHAR(255) NOT NULL,
        option_display_name VARCHAR(255),
        sort_order INTEGER DEFAULT 0,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(product_id, tier_level, option_value)
      );
    `;
    
    const { error: voError } = await supabase.rpc('exec', { sql: createVariantOptions });
    if (voError) {
      console.error('Error creating variant_options:', voError);
    } else {
      console.log('variant_options table created successfully');
    }
    
    // Test the schema after creation
    console.log('\nTesting variant_options table...');
    const { data: variantOptionsTest, error: voTestError } = await supabase
      .from('variant_options')
      .select('*')
      .limit(1);
    
    if (voTestError) {
      console.error('variant_options test error:', voTestError);
    } else {
      console.log('variant_options table accessible');
    }
    
    console.log('\nTesting product_variants table...');
    const { data: productVariantsTest, error: pvTestError } = await supabase
      .from('product_variants')
      .select('*')
      .limit(1);
    
    if (pvTestError) {
      console.error('product_variants test error:', pvTestError);
    } else {
      console.log('product_variants table accessible');
    }
    
  } catch (err) {
    console.error('Script error:', err);
  }
}

runSchemaFix();