require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

// The correct POS Indonesia logo URL
const correctUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/5385ee97-9d8e-44f9-8e2b-4e87d000e8cf-1760063651947.png'

async function updatePosCorrectLogo() {
  try {
    console.log('🔧 Updating POS Indonesia with correct logo URL...')
    
    // First, let's check the current URL
    const { data: currentData, error: fetchError } = await supabase
      .from('shipping_couriers')
      .select('name, logo_data')
      .eq('name', 'POS Indonesia')
      .single()
    
    if (fetchError) {
      console.error('❌ Error fetching current data:', fetchError)
      return
    }
    
    console.log(`📋 Current URL: ${currentData.logo_data}`)
    console.log(`🔄 Correct URL: ${correctUrl}`)
    
    // Test the correct URL first
    console.log('\n🧪 Testing correct URL...')
    try {
      const response = await fetch(correctUrl)
      console.log(`📊 Response status: ${response.status}`)
      if (!response.ok) {
        console.log('❌ Correct URL is not accessible, aborting')
        return
      }
      console.log('✅ Correct URL is accessible!')
    } catch (fetchErr) {
      console.error('❌ Error testing correct URL:', fetchErr.message)
      return
    }
    
    // Update with the correct URL
    const { error } = await supabase
      .from('shipping_couriers')
      .update({ logo_data: correctUrl })
      .eq('name', 'POS Indonesia')
    
    if (error) {
      console.error('❌ Error updating POS Indonesia:', error)
    } else {
      console.log('✅ Successfully updated POS Indonesia with correct logo')
    }
    
    // Verify the update
    const { data: verifyData, error: verifyError } = await supabase
      .from('shipping_couriers')
      .select('name, logo_data')
      .eq('name', 'POS Indonesia')
      .single()
    
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError)
    } else {
      console.log(`\n✅ Verification: ${verifyData.name} -> ${verifyData.logo_data}`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the update
updatePosCorrectLogo()
  .then(() => {
    console.log('\n🎉 POS Indonesia logo update completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })