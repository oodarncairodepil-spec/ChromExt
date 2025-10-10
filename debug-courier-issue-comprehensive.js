const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugComprehensive() {
  try {
    console.log('=== Comprehensive Courier Debug ===\n');
    console.log('Supabase URL:', supabaseUrl);
    console.log('Using anon key:', supabaseKey.substring(0, 20) + '...');

    // Test basic connection
    console.log('\n=== Testing Database Connection ===');
    const { data: testData, error: testError } = await supabase
      .from('shipping_couriers')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Connection test failed:', testError);
      return;
    }
    console.log('✅ Database connection successful');

    // Get ALL shipping couriers (not just active)
    console.log('\n=== Fetching ALL Shipping Couriers ===');
    const { data: allCouriers, error: allCouriersError } = await supabase
      .from('shipping_couriers')
      .select('*')
      .order('name');

    if (allCouriersError) {
      console.error('Error fetching all couriers:', allCouriersError);
      return;
    }

    console.log(`Total couriers in database: ${allCouriers?.length || 0}`);
    if (allCouriers && allCouriers.length > 0) {
      console.log('Active couriers:', allCouriers.filter(c => c.is_active).length);
      console.log('Inactive couriers:', allCouriers.filter(c => !c.is_active).length);
      
      console.log('\nFirst 5 couriers:');
      allCouriers.slice(0, 5).forEach(courier => {
        console.log(`  - ${courier.name} (ID: ${courier.id}, Active: ${courier.is_active})`);
      });
    }

    // Get ALL courier services
    console.log('\n=== Fetching ALL Courier Services ===');
    const { data: allServices, error: allServicesError } = await supabase
      .from('courier_services')
      .select('*')
      .order('courier_id, service_name');

    if (allServicesError) {
      console.error('Error fetching all services:', allServicesError);
    } else {
      console.log(`Total services in database: ${allServices?.length || 0}`);
      if (allServices && allServices.length > 0) {
        console.log('Active services:', allServices.filter(s => s.is_active).length);
        console.log('Inactive services:', allServices.filter(s => !s.is_active).length);
      }
    }

    // Get ALL users
    console.log('\n=== Fetching Users ===');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(5);

    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log(`Found ${users?.length || 0} users (showing first 5)`);
      if (users && users.length > 0) {
        users.forEach(user => {
          console.log(`  - User ID: ${user.id}, Email: ${user.email}`);
        });
      }
    }

    // Get ALL courier preferences
    console.log('\n=== Fetching ALL Courier Preferences ===');
    const { data: allCourierPrefs, error: allCourierPrefsError } = await supabase
      .from('user_courier_preferences')
      .select('*')
      .order('user_id, courier_id');

    if (allCourierPrefsError) {
      console.error('Error fetching all courier preferences:', allCourierPrefsError);
    } else {
      console.log(`Total courier preferences: ${allCourierPrefs?.length || 0}`);
      
      if (allCourierPrefs && allCourierPrefs.length > 0) {
        // Group by user
        const prefsByUser = {};
        allCourierPrefs.forEach(pref => {
          if (!prefsByUser[pref.user_id]) {
            prefsByUser[pref.user_id] = [];
          }
          prefsByUser[pref.user_id].push(pref);
        });
        
        console.log(`Preferences for ${Object.keys(prefsByUser).length} users:`);
        Object.entries(prefsByUser).forEach(([userId, prefs]) => {
          console.log(`  User ${userId}: ${prefs.length} preferences`);
        });
        
        // Check for null/invalid preferences
        console.log('\n=== Checking for Invalid Preferences ===');
        let nullCount = 0;
        let invalidCount = 0;
        
        allCourierPrefs.forEach((pref, index) => {
          if (!pref) {
            console.log(`❌ Null preference at index ${index}`);
            nullCount++;
            return;
          }
          
          const issues = [];
          if (!pref.id) issues.push('missing id');
          if (!pref.user_id) issues.push('missing user_id');
          if (!pref.courier_id) issues.push('missing courier_id');
          if (typeof pref.is_enabled !== 'boolean') issues.push('invalid is_enabled');
          
          if (issues.length > 0) {
            console.log(`❌ Invalid preference:`, {
              index,
              id: pref.id,
              user_id: pref.user_id,
              courier_id: pref.courier_id,
              is_enabled: pref.is_enabled,
              issues
            });
            invalidCount++;
          }
        });
        
        console.log(`Null preferences: ${nullCount}`);
        console.log(`Invalid preferences: ${invalidCount}`);
      }
    }

    // Get ALL service preferences
    console.log('\n=== Fetching ALL Service Preferences ===');
    const { data: allServicePrefs, error: allServicePrefsError } = await supabase
      .from('user_service_preferences')
      .select('*')
      .order('user_id, service_id');

    if (allServicePrefsError) {
      console.error('Error fetching all service preferences:', allServicePrefsError);
    } else {
      console.log(`Total service preferences: ${allServicePrefs?.length || 0}`);
    }

    console.log('\n=== Debug Complete ===');

  } catch (error) {
    console.error('Error during comprehensive debugging:', error);
  }
}

debugComprehensive();