const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupCouriers() {
  try {
    console.log('Setting up shipping couriers tables...')
    console.log('Note: Tables need to be created manually in Supabase dashboard or via SQL editor')
    console.log('Proceeding with data insertion assuming tables exist...')
    
    // Insert sample courier data
    const couriers = [
      { code: 'jne', name: 'JNE', type: 'Regular', is_active: true },
      { code: 'pos', name: 'POS Indonesia', type: 'Regular', is_active: true },
      { code: 'tiki', name: 'TIKI', type: 'Regular', is_active: true },
      { code: 'sicepat', name: 'SiCepat', type: 'Express', is_active: true },
      { code: 'jnt', name: 'J&T Express', type: 'Express', is_active: true },
      { code: 'anteraja', name: 'AnterAja', type: 'Express', is_active: true },
      { code: 'grab', name: 'Grab Express', type: 'Instant', is_active: true },
      { code: 'gosend', name: 'GoSend', type: 'Instant', is_active: true }
    ]
    
    const { error: insertError } = await supabase
      .from('shipping_couriers')
      .upsert(couriers, { onConflict: 'code' })
    
    if (insertError) {
      console.error('Error inserting courier data:', insertError)
    } else {
      console.log('✅ Sample courier data inserted!')
    }
    
    // Get courier IDs for service insertion
    const { data: courierData, error: courierFetchError } = await supabase
      .from('shipping_couriers')
      .select('id, code')
    
    if (courierFetchError) {
      console.error('Error fetching courier data:', courierFetchError)
      return
    }
    
    const courierMap = {}
    courierData.forEach(courier => {
      courierMap[courier.code] = courier.id
    })
    
    // Insert sample courier services using courier_id
    const services = [
      { courier_id: courierMap['jne'], service_name: 'Regular Service', service_code: 'REG', is_active: true },
      { courier_id: courierMap['jne'], service_name: 'Ongkos Kirim Ekonomis', service_code: 'OKE', is_active: true },
      { courier_id: courierMap['jne'], service_name: 'Yakin Esok Sampai', service_code: 'YES', is_active: true },
      { courier_id: courierMap['pos'], service_name: 'Paket Kilat Khusus', service_code: 'PKK', is_active: true },
      { courier_id: courierMap['tiki'], service_name: 'Regular Service', service_code: 'REG', is_active: true },
      { courier_id: courierMap['tiki'], service_name: 'Economy Service', service_code: 'ECO', is_active: true },
      { courier_id: courierMap['sicepat'], service_name: 'Regular Package', service_code: 'REG', is_active: true },
      { courier_id: courierMap['sicepat'], service_name: 'Best Package', service_code: 'BEST', is_active: true },
      { courier_id: courierMap['jnt'], service_name: 'Regular', service_code: 'REG', is_active: true },
      { courier_id: courierMap['jnt'], service_name: 'Easy', service_code: 'EZ', is_active: true },
      { courier_id: courierMap['anteraja'], service_name: 'Regular', service_code: 'REG', is_active: true },
      { courier_id: courierMap['anteraja'], service_name: 'Next Day', service_code: 'NEXT_DAY', is_active: true },
      { courier_id: courierMap['grab'], service_name: 'Sameday', service_code: 'SD', is_active: true },
      { courier_id: courierMap['grab'], service_name: 'Instant', service_code: 'INST', is_active: true },
      { courier_id: courierMap['gosend'], service_name: 'Sameday', service_code: 'SD', is_active: true },
      { courier_id: courierMap['gosend'], service_name: 'Instant', service_code: 'INST', is_active: true }
    ].filter(service => service.courier_id) // Filter out services for non-existent couriers

    const { error: servicesError } = await supabase
      .from('courier_services')
      .upsert(services, { onConflict: 'courier_id,service_name' })
    
    if (servicesError) {
      console.error('Error inserting services data:', servicesError)
    } else {
      console.log('✅ Sample courier services inserted!')
    }
    
  } catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
}

setupCouriers()