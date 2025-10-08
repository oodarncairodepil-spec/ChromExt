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
      { code: 'anteraja', name: 'AnterAja', type: 'Express', is_active: true }
    ]
    
    const { error: insertError } = await supabase
      .from('shipping_couriers')
      .upsert(couriers, { onConflict: 'code' })
    
    if (insertError) {
      console.error('Error inserting courier data:', insertError)
    } else {
      console.log('✅ Sample courier data inserted!')
    }
    
    // Insert sample courier services
    const services = [
      { courier_code: 'jne', service_code: 'REG', service_name: 'Regular Service', is_active: true },
      { courier_code: 'jne', service_code: 'OKE', service_name: 'Ongkos Kirim Ekonomis', is_active: true },
      { courier_code: 'jne', service_code: 'YES', service_name: 'Yakin Esok Sampai', is_active: true },
      { courier_code: 'pos', service_code: 'Paket Kilat Khusus', service_name: 'Paket Kilat Khusus', is_active: true },
      { courier_code: 'tiki', service_code: 'REG', service_name: 'Regular Service', is_active: true },
      { courier_code: 'tiki', service_code: 'ECO', service_name: 'Economy Service', is_active: true },
      { courier_code: 'sicepat', service_code: 'REG', service_name: 'Regular Package', is_active: true },
      { courier_code: 'sicepat', service_code: 'BEST', service_name: 'Best Package', is_active: true },
      { courier_code: 'jnt', service_code: 'REG', service_name: 'Regular', is_active: true },
      { courier_code: 'jnt', service_code: 'EZ', service_name: 'Easy', is_active: true },
      { courier_code: 'anteraja', service_code: 'REG', service_name: 'Regular', is_active: true },
      { courier_code: 'anteraja', service_code: 'NEXT_DAY', service_name: 'Next Day', is_active: true }
    ]
    
    const { error: servicesError } = await supabase
      .from('courier_services')
      .upsert(services, { onConflict: 'courier_code,service_code' })
    
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