require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

// Fix POS Indonesia URL - remove the '-logo.png' suffix and use proper timestamp format
const correctUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/c18041f2-705c-4d03-8345-25c9675b2e7e-1760063665000.png'

async function fixPosIndonesiaUrl() {
  try {
    console.log('🔧 Fixing POS Indonesia logo URL...')
    
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
    console.log(`🔄 New URL: ${correctUrl}`)
    
    // Update with the corrected URL
    const { error } = await supabase
      .from('shipping_couriers')
      .update({ logo_data: correctUrl })
      .eq('name', 'POS Indonesia')
    
    if (error) {
      console.error('❌ Error updating POS Indonesia:', error)
    } else {
      console.log('✅ Successfully updated POS Indonesia logo URL')
    }
    
    // Verify the fix by testing the URL
    console.log('\n🔍 Testing the new URL...')
    try {
      const response = await fetch(correctUrl)
      console.log(`📊 Response status: ${response.status}`)
      if (response.ok) {
        console.log('✅ URL is accessible!')
      } else {
        console.log('❌ URL still not accessible')
      }
    } catch (fetchErr) {
      console.error('❌ Error testing URL:', fetchErr.message)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixPosIndonesiaUrl()
  .then(() => {
    console.log('\n🎉 POS Indonesia URL fix completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })