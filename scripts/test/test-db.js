const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.PLASMO_PUBLIC_SUPABASE_URL, process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY);

async function testDatabase() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    
    if (error) {
      console.error('Database error:', error);
      return;
    }
    
    console.log('Database connection successful');
    console.log('Sample order data:', data);
    
    // Test inserting a draft order to see what fails
    const testOrder = {
      seller_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      buyer_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
      items: [],
      shipping_info: {},
      discount: {},
      subtotal: 0,
      total: 0,
      shipping_fee: 0,
      status: 'draft',
      customer_name: 'Test',
      customer_address: 'Test Address',
      customer_phone: '1234567890',
      customer_city: 'Test City',
      total_amount: 0
    };
    
    console.log('Testing order insert (will likely fail due to foreign keys, but we can see the error)...');
    const { data: insertData, error: insertError } = await supabase
      .from('orders')
      .insert(testOrder)
      .select();
      
    if (insertError) {
      console.log('Insert error (expected):', insertError.message);
      // Check if it mentions shipping_fee column
      if (insertError.message.includes('shipping_fee')) {
        console.log('❌ shipping_fee column issue detected');
      } else {
        console.log('✅ shipping_fee column seems to exist (error is about something else)');
      }
    } else {
      console.log('Insert successful (unexpected):', insertData);
    }
    
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testDatabase();