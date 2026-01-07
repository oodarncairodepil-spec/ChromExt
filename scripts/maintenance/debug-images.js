require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Test with anon key (frontend simulation)
const anonClient = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
);

console.log('Environment check:');
console.log('- SUPABASE_URL:', process.env.PLASMO_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
console.log('- ANON_KEY:', process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING');
console.log('- SERVICE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');

async function testImageAccess() {
  console.log('🔍 Testing image access with different keys...');
  
  const testProductId = '4cec58e6-2883-4bd7-aa2e-bd970bde4da1';
  
  console.log('\n--- Testing with ANON key (frontend simulation) ---');
  try {
    const { data: anonData, error: anonError } = await anonClient
      .from('product_images')
      .select('image_url, is_primary')
      .eq('product_id', testProductId)
      .eq('is_primary', true)
      .limit(1);
    
    console.log('Anon query result:');
    console.log('Data:', JSON.stringify(anonData, null, 2));
    console.log('Error:', anonError);
  } catch (err) {
    console.error('Anon query exception:', err);
  }
  
  console.log('\n--- Testing any image query ---');
  try {
    const { data: anyData, error: anyError } = await anonClient
      .from('product_images')
      .select('image_url, is_primary')
      .eq('product_id', testProductId)
      .limit(1);
    
    console.log('Any image query result:');
    console.log('Data:', JSON.stringify(anyData, null, 2));
    console.log('Error:', anyError);
  } catch (err) {
    console.error('Any image query exception:', err);
  }
  
  console.log('\n--- Testing table access ---');
  try {
    const { data: allData, error: allError } = await anonClient
      .from('product_images')
      .select('product_id, image_url, is_primary')
      .limit(3);
    
    console.log('All images query result (first 3):');
    console.log('Data:', JSON.stringify(allData, null, 2));
    console.log('Error:', allError);
  } catch (err) {
    console.error('All images query exception:', err);
  }
}

testImageAccess().catch(console.error);