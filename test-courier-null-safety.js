const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
);

async function testCourierNullSafety() {
  try {
    console.log('🔍 Testing courier data integrity and null safety...');
    
    // Test 1: Check for null values in courier_services
    console.log('\n1. Checking courier_services for null values...');
    const { data: services, error: servicesError } = await supabase
      .from('courier_services')
      .select('*')
      .eq('is_active', true);
    
    if (servicesError) {
      console.error('❌ Error fetching services:', servicesError);
      return;
    }
    
    const nullServices = services.filter(s => !s || !s.id || !s.courier_id);
    console.log(`✅ Total services: ${services.length}`);
    console.log(`${nullServices.length === 0 ? '✅' : '❌'} Null/invalid services: ${nullServices.length}`);
    
    if (nullServices.length > 0) {
      console.log('❌ Invalid services found:', nullServices);
    }
    
    // Test 2: Check for null values in user_courier_preferences
    console.log('\n2. Checking user_courier_preferences for null values...');
    const { data: courierPrefs, error: courierPrefsError } = await supabase
      .from('user_courier_preferences')
      .select('*');
    
    if (courierPrefsError) {
      console.error('❌ Error fetching courier preferences:', courierPrefsError);
      return;
    }
    
    const nullCourierPrefs = courierPrefs.filter(p => !p || !p.id || !p.courier_id || !p.user_id);
    console.log(`✅ Total courier preferences: ${courierPrefs.length}`);
    console.log(`${nullCourierPrefs.length === 0 ? '✅' : '❌'} Null/invalid courier preferences: ${nullCourierPrefs.length}`);
    
    if (nullCourierPrefs.length > 0) {
      console.log('❌ Invalid courier preferences found:', nullCourierPrefs);
    }
    
    // Test 3: Check for null values in user_service_preferences
    console.log('\n3. Checking user_service_preferences for null values...');
    const { data: servicePrefs, error: servicePrefsError } = await supabase
      .from('user_service_preferences')
      .select('*');
    
    if (servicePrefsError) {
      console.error('❌ Error fetching service preferences:', servicePrefsError);
      return;
    }
    
    const nullServicePrefs = servicePrefs.filter(p => !p || !p.id || !p.service_id || !p.user_id);
    console.log(`✅ Total service preferences: ${servicePrefs.length}`);
    console.log(`${nullServicePrefs.length === 0 ? '✅' : '❌'} Null/invalid service preferences: ${nullServicePrefs.length}`);
    
    if (nullServicePrefs.length > 0) {
      console.log('❌ Invalid service preferences found:', nullServicePrefs);
    }
    
    // Test 4: Check for orphaned preferences (preferences without corresponding services/couriers)
    console.log('\n4. Checking for orphaned preferences...');
    
    const { data: couriers, error: couriersError } = await supabase
      .from('shipping_couriers')
      .select('id')
      .eq('is_active', true);
    
    if (couriersError) {
      console.error('❌ Error fetching couriers:', couriersError);
      return;
    }
    
    const courierIds = new Set(couriers.map(c => c.id));
    const serviceIds = new Set(services.map(s => s.id));
    
    const orphanedCourierPrefs = courierPrefs.filter(p => p && p.courier_id && !courierIds.has(p.courier_id));
    const orphanedServicePrefs = servicePrefs.filter(p => p && p.service_id && !serviceIds.has(p.service_id));
    
    console.log(`${orphanedCourierPrefs.length === 0 ? '✅' : '❌'} Orphaned courier preferences: ${orphanedCourierPrefs.length}`);
    console.log(`${orphanedServicePrefs.length === 0 ? '✅' : '❌'} Orphaned service preferences: ${orphanedServicePrefs.length}`);
    
    if (orphanedCourierPrefs.length > 0) {
      console.log('❌ Orphaned courier preferences:', orphanedCourierPrefs.map(p => ({ id: p.id, courier_id: p.courier_id })));
    }
    
    if (orphanedServicePrefs.length > 0) {
      console.log('❌ Orphaned service preferences:', orphanedServicePrefs.map(p => ({ id: p.id, service_id: p.service_id })));
    }
    
    // Summary
    console.log('\n📊 SUMMARY:');
    const totalIssues = nullServices.length + nullCourierPrefs.length + nullServicePrefs.length + orphanedCourierPrefs.length + orphanedServicePrefs.length;
    
    if (totalIssues === 0) {
      console.log('🎉 All data integrity checks passed! No null values or orphaned records found.');
      console.log('✅ The courier toggle functionality should work without hanging.');
    } else {
      console.log(`❌ Found ${totalIssues} data integrity issues that could cause hanging.`);
      console.log('🔧 Consider cleaning up the data or adding more robust error handling.');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

testCourierNullSafety();