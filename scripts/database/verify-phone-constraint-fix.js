const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials in .env file');
  console.log('Please ensure PLASMO_PUBLIC_SUPABASE_URL and PLASMO_PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConstraint() {
  try {
    console.log('🔍 Testing phone constraint behavior...');
    
    const testPhone = '+62812345678901'; // Test phone number
    const testUserId1 = '550e8400-e29b-41d4-a716-446655440001'; // UUID format
    const testUserId2 = '550e8400-e29b-41d4-a716-446655440002'; // UUID format
    
    // Clean up any existing test data first
    console.log('🧹 Cleaning up existing test data...');
    await supabase.from('users').delete().eq('phone', testPhone);
    
    // Test 1: Create first user with test phone
    console.log('📝 Test 1: Creating first user with phone', testPhone);
    const { data: user1, error: error1 } = await supabase
      .from('users')
      .insert({
        user_id: testUserId1,
        phone: testPhone,
        name: 'Test User 1'
      })
      .select();
    
    if (error1) {
      console.log('❌ Error creating first user:', error1.message);
      return;
    }
    console.log('✅ First user created successfully');
    
    // Test 2: Try to create second user with same phone but different user_id
    console.log('📝 Test 2: Creating second user with same phone, different user_id');
    const { data: user2, error: error2 } = await supabase
      .from('users')
      .insert({
        user_id: testUserId2,
        phone: testPhone,
        name: 'Test User 2'
      })
      .select();
    
    if (error2) {
      if (error2.message.includes('duplicate key') || error2.message.includes('unique')) {
        console.log('❌ Constraint fix NOT working - still preventing duplicate phones');
        console.log('   Error:', error2.message);
      } else {
        console.log('❌ Unexpected error:', error2.message);
      }
    } else {
      console.log('✅ Second user created successfully!');
      console.log('✅ Phone constraint fix is working correctly!');
      console.log('   - Same phone number allowed for different user_ids');
    }
    
    // Test 3: Try to create user with same phone AND same user_id (should fail)
    console.log('📝 Test 3: Trying same phone + same user_id (should fail)');
    const { data: user3, error: error3 } = await supabase
      .from('users')
      .insert({
        user_id: testUserId1, // Same user_id as first user
        phone: testPhone,
        name: 'Test User 3'
      })
      .select();
    
    if (error3) {
      if (error3.message.includes('duplicate key') || error3.message.includes('unique')) {
        console.log('✅ Constraint working correctly - preventing duplicate (phone + user_id)');
      } else {
        console.log('⚠️  Unexpected error:', error3.message);
      }
    } else {
      console.log('⚠️  Warning: Should have failed but didn\'t');
    }
    
    // Clean up test data
    console.log('🧹 Cleaning up test data...');
    await supabase.from('users').delete().eq('phone', testPhone);
    console.log('✅ Test completed');
    
  } catch (error) {
    console.error('❌ Error during test:', error.message);
  }
}

testConstraint();