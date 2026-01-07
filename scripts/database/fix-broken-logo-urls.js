require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
)

// URLs that need fixing (remove duplicate courier-logos/ path)
const urlFixes = {
  'Ninja Express': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/e7103ea4-daf1-415b-9079-503673df1317-1760063644773.png',
  'Paxel': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/ac59851a-466a-4c62-906f-66a7182e4d55-1760063647536.png',
  'SAP Express': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/cd795c1c-7904-4837-ba3f-a25e5c469f39-1760063692405.png',
  'TIKI': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/b7a801e4-e4af-4ceb-8771-913b335f8936-1760063673649.png'
}

async function fixBrokenUrls() {
  try {
    console.log('🔧 Fixing broken courier logo URLs...')
    
    let fixedCount = 0
    
    for (const [courierName, correctUrl] of Object.entries(urlFixes)) {
      console.log(`\n🔄 Fixing ${courierName}...`)
      
      const { error } = await supabase
        .from('shipping_couriers')
        .update({ logo_data: correctUrl })
        .eq('name', courierName)
      
      if (error) {
        console.error(`❌ Error fixing ${courierName}:`, error)
      } else {
        console.log(`✅ Fixed ${courierName}: ${correctUrl}`)
        fixedCount++
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`✅ Fixed: ${fixedCount} URLs`)
    console.log(`📦 Total attempted: ${Object.keys(urlFixes).length}`)
    
    // Verify the fixes
    console.log('\n🔍 Verifying fixes...')
    const { data: updatedCouriers, error: verifyError } = await supabase
      .from('shipping_couriers')
      .select('name, logo_data')
      .in('name', Object.keys(urlFixes))
    
    if (verifyError) {
      console.error('❌ Error verifying fixes:', verifyError)
    } else {
      console.log('\n✅ Verification results:')
      updatedCouriers.forEach(courier => {
        console.log(`  - ${courier.name}: ${courier.logo_data}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the fix
fixBrokenUrls()
  .then(() => {
    console.log('\n🎉 URL fix process completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })