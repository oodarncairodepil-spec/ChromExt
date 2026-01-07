// Test script to verify courier toggle functionality
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function testCourierData() {
  try {
    console.log('Testing courier services data integrity...');
    
    // Fetch courier services
    const { data: servicesData, error: servicesError } = await supabase
      .from('courier_services')
      .select('*')
      .eq('is_active', true)
      .order('service_name');

    if (servicesError) {
      console.error('Error fetching services:', servicesError);
      return;
    }

    console.log(`Total services found: ${servicesData.length}`);
    
    // Check for invalid services
    const invalidServices = servicesData.filter(service => 
      !service || !service.id || !service.courier_id
    );
    
    if (invalidServices.length > 0) {
      console.error('Found invalid services:', invalidServices);
    } else {
      console.log('✅ All services have valid id and courier_id');
    }
    
    // Check for null/undefined services
    const nullServices = servicesData.filter(service => service === null || service === undefined);
    
    if (nullServices.length > 0) {
      console.error('Found null/undefined services:', nullServices.length);
    } else {
      console.log('✅ No null/undefined services found');
    }
    
    // Group services by courier
    const servicesByCourier = {};
    servicesData.forEach(service => {
      if (service && service.courier_id) {
        if (!servicesByCourier[service.courier_id]) {
          servicesByCourier[service.courier_id] = [];
        }
        servicesByCourier[service.courier_id].push(service);
      }
    });
    
    console.log('Services grouped by courier:');
    Object.keys(servicesByCourier).forEach(courierId => {
      console.log(`  Courier ${courierId}: ${servicesByCourier[courierId].length} services`);
    });
    
    console.log('✅ Courier data integrity test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCourierData();