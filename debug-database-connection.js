const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
);

async function debugDatabaseConnection() {
  try {
    console.log('🔍 Debugging database connection and data...');
    console.log('Supabase URL:', process.env.PLASMO_PUBLIC_SUPABASE_URL);
    console.log('Supabase Key (first 20 chars):', process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
    
    // Test 1: Check all courier services (without is_active filter)
    console.log('\n1. Checking ALL courier_services (no filters)...');
    const { data: allServices, error: allServicesError } = await supabase
      .from('courier_services')
      .select('*');
    
    if (allServicesError) {
      console.error('❌ Error fetching all services:', allServicesError);
    } else {
      console.log(`✅ Total services in database: ${allServices.length}`);
      const activeServices = allServices.filter(s => s.is_active);
      console.log(`✅ Active services: ${activeServices.length}`);
      
      if (allServices.length > 0) {
        console.log('Sample service:', allServices[0]);
      }
    }
    
    // Test 2: Check all couriers
    console.log('\n2. Checking ALL shipping_couriers...');
    const { data: allCouriers, error: allCouriersError } = await supabase
      .from('shipping_couriers')
      .select('*');
    
    if (allCouriersError) {
      console.error('❌ Error fetching all couriers:', allCouriersError);
    } else {
      console.log(`✅ Total couriers in database: ${allCouriers.length}`);
      const activeCouriers = allCouriers.filter(c => c.is_active);
      console.log(`✅ Active couriers: ${activeCouriers.length}`);
      
      if (allCouriers.length > 0) {
        console.log('Sample courier:', allCouriers[0]);
      }
    }
    
    // Test 3: Test basic connection
    console.log('\n3. Testing basic database connection...');
    const { data: testData, error: testError } = await supabase
      .from('shipping_couriers')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Database connection test failed:', testError);
    } else {
      console.log('✅ Database connection successful');
    }
    
    // Test 4: Check user preferences with a specific user
    console.log('\n4. Checking user preferences...');
    const { data: users, error: usersError } = await supabase
      .from('user_courier_preferences')
      .select('user_id')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error fetching user preferences:', usersError);
    } else {
      console.log(`✅ Found ${users.length} user preference records`);
      if (users.length > 0) {
        const sampleUserId = users[0].user_id;
        console.log('Sample user ID:', sampleUserId);
        
        // Check preferences for this user
        const { data: userCourierPrefs, error: userCourierPrefsError } = await supabase
          .from('user_courier_preferences')
          .select('*')
          .eq('user_id', sampleUserId);
        
        const { data: userServicePrefs, error: userServicePrefsError } = await supabase
          .from('user_service_preferences')
          .select('*')
          .eq('user_id', sampleUserId);
        
        if (!userCourierPrefsError && !userServicePrefsError) {
          console.log(`✅ User has ${userCourierPrefs.length} courier preferences and ${userServicePrefs.length} service preferences`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed with error:', error);
  }
}

debugDatabaseConnection();