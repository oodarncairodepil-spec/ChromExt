require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use service role key to bypass RLS
const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function checkProductsSchema() {
  try {
    console.log('Checking products table schema with admin access...');
    
    // Try to get any existing products first
    const { data: existingProducts, error: selectError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.error('Error querying products table:', selectError);
      return;
    }
    
    if (existingProducts && existingProducts.length > 0) {
      console.log('Found existing products. Current columns:');
      console.log(Object.keys(existingProducts[0]));
      
      // Check specifically for image column
      if ('image' in existingProducts[0]) {
        console.log('✅ Image column exists');
        console.log('Sample image value:', existingProducts[0].image);
      } else {
        console.log('❌ Image column does NOT exist');
      }
    } else {
      console.log('No existing products found. Testing table structure...');
      
      // Create a test user first (we need a valid user_id)
      const testUserId = '00000000-0000-0000-0000-000000000001';
      
      // Try to insert a minimal test record to see what columns are required/available
      const { data: insertData, error: insertError } = await supabase
        .from('products')
        .insert({
          name: 'Test Product Schema Check',
          price: 1.00,
          user_id: testUserId
        })
        .select();
      
      if (insertError) {
        console.log('Insert failed:', insertError.message);
        console.log('This might indicate missing required columns or constraints.');
        
        // Try with more columns
        const { data: insertData2, error: insertError2 } = await supabase
          .from('products')
          .insert({
            name: 'Test Product Schema Check 2',
            description: 'Test description',
            price: 1.00,
            stock: 0,
            user_id: testUserId,
            image: 'https://example.com/test.jpg' // Try including image column
          })
          .select();
        
        if (insertError2) {
          console.log('Second insert also failed:', insertError2.message);
        } else if (insertData2 && insertData2.length > 0) {
          console.log('✅ Second insert succeeded! Available columns:');
          console.log(Object.keys(insertData2[0]));
          
          if ('image' in insertData2[0]) {
            console.log('✅ Image column exists and accepts data');
          } else {
            console.log('❌ Image column does not exist');
          }
          
          // Clean up test record
          await supabase.from('products').delete().eq('id', insertData2[0].id);
          console.log('Test record cleaned up.');
        }
      } else if (insertData && insertData.length > 0) {
        console.log('✅ Insert succeeded! Available columns:');
        console.log(Object.keys(insertData[0]));
        
        if ('image' in insertData[0]) {
          console.log('✅ Image column exists');
        } else {
          console.log('❌ Image column does not exist');
        }
        
        // Clean up test record
        await supabase.from('products').delete().eq('id', insertData[0].id);
        console.log('Test record cleaned up.');
      }
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

checkProductsSchema();