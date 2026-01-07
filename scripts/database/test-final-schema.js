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

async function testSchema() {
  try {
    console.log('Testing variant_options table with option_value column...');
    
    // Test variant_options with option_value
    const { data: voData, error: voError } = await supabase
      .from('variant_options')
      .insert({
        product_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        tier_level: 1,
        tier_name: 'Color',
        option_value: 'Red',
        option_display_name: 'Red Color'
      })
      .select();
    
    if (voError) {
      console.error('variant_options insert error:', voError);
    } else {
      console.log('variant_options insert successful:', voData);
      
      // Clean up the test data
      await supabase
        .from('variant_options')
        .delete()
        .eq('id', voData[0].id);
    }
    
    console.log('\nTesting product_variants table with correct columns...');
    
    // Test product_variants with correct columns
    const { data: pvData, error: pvError } = await supabase
      .from('product_variants')
      .insert({
        product_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        variant_tier_1_value: 'Red',
        variant_tier_2_value: 'Large',
        full_product_name: 'Test Product Red Large',
        price: 29.99,
        stock: 10,
        sku_suffix: 'RED-L'
      })
      .select();
    
    if (pvError) {
      console.error('product_variants insert error:', pvError);
    } else {
      console.log('product_variants insert successful:', pvData);
      
      // Clean up the test data
      await supabase
        .from('product_variants')
        .delete()
        .eq('id', pvData[0].id);
    }
    
    console.log('\nSchema test completed!');
    
  } catch (err) {
    console.error('Test error:', err);
  }
}

testSchema();