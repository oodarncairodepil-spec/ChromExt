const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Mapping of courier names to their logo URLs
const courierLogos = {
  'Sentral Cargo': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/853bbb12-b988-4636-a1f9-8eee17b49628-1760063686270.png',
  'GoSend': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/7d410715-e91e-4f55-a134-ed65049d6fd4-1760063581670.png',
  'Pos Indonesia': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/5385ee97-9d8e-44f9-8e2b-4e87d000e8cf-1760063651947.png',
  'Lion Parcel': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/2dbaec87-de87-4259-be2d-3b915633b88c-1760063628730.png',
  'Grab Express': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/2560abbd-a095-429c-87e0-ff584e8a6e3f-1760063585994.png',
  'Wahana': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/1e2ab996-13e1-4c48-ab6a-979ec1d1c578-1760063668199.png',
  'J&T Express': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/0edf62dc-e404-4186-9bc0-fe718a862ebf-1760063599701.png',
  'ID Express': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/0bc8c192-401d-40c2-aba6-0c3c6ecee814-1760063590130.png',
  'SiCepat': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/056d99ee-c907-4f5c-b656-f1d70ea83df0-1760063678919.png',
  'JNE': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/0480d9b5-cfee-4c22-85e4-e3b183dd5dd9-1760063622283.png',
  'Paxel': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/courier-logos/ac59851a-466a-4c62-906f-66a7182e4d55-1760063647536.png',
  'TIKI': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/courier-logos/b7a801e4-e4af-4ceb-8771-913b335f8936-1760063673649.png',
  'Tiki': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/courier-logos/b7a801e4-e4af-4ceb-8771-913b335f8936-1760063673649.png',
  'AnterAja': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/courier-logos/cf957ff8-c0f3-49ae-8020-7310b933c146-1760063572976.png',
  'SAP Express': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/courier-logos/cd795c1c-7904-4837-ba3f-a25e5c469f39-1760063692405.png',
  'Ninja Express': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/courier-logos/e7103ea4-daf1-415b-9079-503673df1317-1760063644773.png'
}

async function updateCourierLogos() {
  try {
    console.log('🚀 Starting courier logo update process...')
    
    // First, get all couriers from the database
    const { data: couriers, error: fetchError } = await supabase
      .from('shipping_couriers')
      .select('id, code, name, logo_data')
    
    if (fetchError) {
      console.error('❌ Error fetching couriers:', fetchError)
      return
    }
    
    console.log(`📦 Found ${couriers.length} couriers in database`)
    
    let updatedCount = 0
    let skippedCount = 0
    
    // Update each courier's logo
    for (const courier of couriers) {
      const logoUrl = courierLogos[courier.name]
      
      if (logoUrl) {
        console.log(`🔄 Updating logo for ${courier.name}...`)
        
        const { error: updateError } = await supabase
          .from('shipping_couriers')
          .update({ logo_data: logoUrl })
          .eq('id', courier.id)
        
        if (updateError) {
          console.error(`❌ Error updating ${courier.name}:`, updateError)
        } else {
          console.log(`✅ Updated ${courier.name} with logo: ${logoUrl.substring(0, 80)}...`)
          updatedCount++
        }
      } else {
        console.log(`⚠️  No logo URL found for ${courier.name} (code: ${courier.code})`)
        skippedCount++
      }
    }
    
    console.log('\n📊 Update Summary:')
    console.log(`✅ Successfully updated: ${updatedCount} couriers`)
    console.log(`⚠️  Skipped (no logo URL): ${skippedCount} couriers`)
    console.log(`📦 Total couriers: ${couriers.length}`)
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...')
    const { data: updatedCouriers, error: verifyError } = await supabase
      .from('shipping_couriers')
      .select('name, logo_data')
      .not('logo_data', 'is', null)
    
    if (verifyError) {
      console.error('❌ Error verifying updates:', verifyError)
    } else {
      console.log(`\n✅ Verification complete: ${updatedCouriers.length} couriers now have logo URLs`)
      updatedCouriers.forEach(courier => {
        console.log(`  - ${courier.name}: ${courier.logo_data ? '✅ Has logo' : '❌ No logo'}`)
      })
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the update
updateCourierLogos()
  .then(() => {
    console.log('\n🎉 Courier logo update process completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })