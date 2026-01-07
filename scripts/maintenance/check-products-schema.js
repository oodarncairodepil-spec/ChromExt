require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProductsSchema() {
  try {
    console.log('Checking products table schema...');
    
    // Try to get a sample product to see the current columns
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying products table:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Current products table columns:');
      console.log(Object.keys(data[0]));
      
      // Check specifically for image column
      if ('image' in data[0]) {
        console.log('✅ Image column exists');
        console.log('Sample image value:', data[0].image);
      } else {
        console.log('❌ Image column does NOT exist');
      }
    } else {
      console.log('No products found in table');
      
      // Try to insert a test record to see what columns are available
      const { error: insertError } = await supabase
        .from('products')
        .insert({
          name: 'Test Product',
          price: 10.00,
          user_id: '00000000-0000-0000-0000-000000000000' // dummy UUID
        })
        .select();
      
      if (insertError) {
        console.log('Insert error (this helps us see required columns):', insertError.message);
      }
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

checkProductsSchema();