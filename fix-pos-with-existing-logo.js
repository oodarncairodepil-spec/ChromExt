require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

// Use one of the existing working logos as a placeholder for POS Indonesia
// Using the first available logo from the storage list
const placeholderUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/0480d9b5-cfee-4c22-85e4-e3b183dd5dd9-1760063622283.png'

async function fixPosWithExistingLogo() {
  try {
    console.log('🔧 Fixing POS Indonesia with existing placeholder logo...')
    
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
    console.log(`🔄 Placeholder URL: ${placeholderUrl}`)
    
    // Test the placeholder URL first
    console.log('\n🧪 Testing placeholder URL...')
    try {
      const response = await fetch(placeholderUrl)
      console.log(`📊 Response status: ${response.status}`)
      if (!response.ok) {
        console.log('❌ Placeholder URL is not accessible, aborting')
        return
      }
      console.log('✅ Placeholder URL is accessible!')
    } catch (fetchErr) {
      console.error('❌ Error testing placeholder URL:', fetchErr.message)
      return
    }
    
    // Update with the placeholder URL
    const { error } = await supabase
      .from('shipping_couriers')
      .update({ logo_data: placeholderUrl })
      .eq('name', 'POS Indonesia')
    
    if (error) {
      console.error('❌ Error updating POS Indonesia:', error)
    } else {
      console.log('✅ Successfully updated POS Indonesia with placeholder logo')
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

// Run the fix
fixPosWithExistingLogo()
  .then(() => {
    console.log('\n🎉 POS Indonesia placeholder fix completed!')
    console.log('💡 Note: You may want to upload a proper POS Indonesia logo later')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })