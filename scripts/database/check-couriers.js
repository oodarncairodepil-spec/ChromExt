const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCouriers() {
  try {
    console.log('🔍 Checking shipping_couriers table...')
    
    // Check if table exists and get all data
    const { data: couriers, error: fetchError } = await supabase
      .from('shipping_couriers')
      .select('*')
    
    if (fetchError) {
      console.error('❌ Error fetching couriers:', fetchError)
      
      // Try to get table info
      console.log('\n🔍 Checking table structure...')
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_info', { table_name: 'shipping_couriers' })
      
      if (tableError) {
        console.error('❌ Error getting table info:', tableError)
      } else {
        console.log('📋 Table info:', tableInfo)
      }
      
      return
    }
    
    console.log(`📦 Found ${couriers.length} couriers in database`)
    
    if (couriers.length > 0) {
      console.log('\n📋 Courier details:')
      couriers.forEach((courier, index) => {
        console.log(`${index + 1}. ${courier.name} (${courier.code})`)
        console.log(`   ID: ${courier.id}`)
        console.log(`   Logo: ${courier.logo_data || 'No logo'}`)
        console.log(`   Active: ${courier.is_active}`)
        console.log('')
      })
    } else {
      console.log('⚠️  No couriers found in the database')
      console.log('💡 You may need to run the setup script first')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the check
checkCouriers()
  .then(() => {
    console.log('\n✅ Check completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })