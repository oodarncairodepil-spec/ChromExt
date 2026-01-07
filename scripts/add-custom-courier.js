const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addCustomCourier() {
  try {
    console.log('Adding Custom Courier to database...');
    
    // First, add the custom courier
    const { data: courierData, error: courierError } = await supabase
      .from('shipping_couriers')
      .upsert({
        code: 'custom',
        name: 'Custom Courier',
        type: 'Custom',
        has_cod: false,
        has_insurance: false,
        min_weight: 0.0,
        min_cost: 0,
        has_pickup: false,
        cutoff_time: null,
        is_active: true
      }, {
        onConflict: 'code'
      })
      .select();
    
    if (courierError) {
      console.error('Error adding custom courier:', courierError);
      return;
    }
    
    console.log('Custom courier added:', courierData);
    
    // Get the courier ID
    const { data: courier } = await supabase
      .from('shipping_couriers')
      .select('id')
      .eq('code', 'custom')
      .single();
    
    if (!courier) {
      console.error('Could not find custom courier ID');
      return;
    }
    
    // Add a basic service for the custom courier
    const { data: serviceData, error: serviceError } = await supabase
      .from('courier_services')
      .upsert({
        courier_id: courier.id,
        service_name: 'Manual Delivery',
        service_code: 'MANUAL',
        description: 'Custom delivery method set by seller',
        is_active: true
      }, {
        onConflict: 'courier_id,service_name'
      })
      .select();
    
    if (serviceError) {
      console.error('Error adding custom courier service:', serviceError);
      return;
    }
    
    console.log('Custom courier service added:', serviceData);
    
    // Verify the custom courier was added
    const { data: verification } = await supabase
      .from('shipping_couriers')
      .select('id, code, name, type')
      .eq('code', 'custom');
    
    console.log('Verification - Custom courier in database:', verification);
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

addCustomCourier();