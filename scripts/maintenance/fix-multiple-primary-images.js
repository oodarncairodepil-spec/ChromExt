const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
)

async function fixMultiplePrimaryImages() {
  try {
    console.log('🔧 Fixing multiple primary images issue...')
    
    // Get all product images grouped by product_id
    const { data: allImages, error: allImagesError } = await supabase
      .from('product_images')
      .select('*')
      .order('created_at', { ascending: true }) // Oldest first
    
    if (allImagesError) {
      console.error('❌ Error fetching product images:', allImagesError)
      return
    }
    
    // Group images by product_id
    const imagesByProduct = {}
    allImages.forEach(img => {
      if (!imagesByProduct[img.product_id]) {
        imagesByProduct[img.product_id] = []
      }
      imagesByProduct[img.product_id].push(img)
    })
    
    console.log(`\n📊 Found ${Object.keys(imagesByProduct).length} products with images`)
    
    let fixedProducts = 0
    let totalUpdates = 0
    
    // Process each product
    for (const [productId, images] of Object.entries(imagesByProduct)) {
      const primaryImages = images.filter(img => img.is_primary)
      
      if (primaryImages.length > 1) {
        console.log(`\n🔧 Fixing product ${productId}: ${primaryImages.length} primary images found`)
        
        // Keep the first (oldest) image as primary, set others to false
        const keepAsPrimary = primaryImages[0]
        const setToSecondary = primaryImages.slice(1)
        
        console.log(`   ✅ Keeping as primary: ${keepAsPrimary.image_url.substring(0, 60)}...`)
        console.log(`   📝 Setting ${setToSecondary.length} images to secondary:`)
        
        for (const img of setToSecondary) {
          console.log(`      - ${img.image_url.substring(0, 60)}...`)
          
          const { error: updateError } = await supabase
            .from('product_images')
            .update({ is_primary: false })
            .eq('id', img.id)
          
          if (updateError) {
            console.error(`      ❌ Error updating image ${img.id}:`, updateError)
          } else {
            console.log(`      ✅ Updated successfully`)
            totalUpdates++
          }
        }
        
        fixedProducts++
      } else if (primaryImages.length === 0 && images.length > 0) {
        // No primary image set, make the first one primary
        console.log(`\n🔧 Product ${productId}: No primary image, setting first image as primary`)
        const firstImage = images[0]
        
        const { error: updateError } = await supabase
          .from('product_images')
          .update({ is_primary: true })
          .eq('id', firstImage.id)
        
        if (updateError) {
          console.error(`   ❌ Error setting primary image:`, updateError)
        } else {
          console.log(`   ✅ Set as primary: ${firstImage.image_url.substring(0, 60)}...`)
          fixedProducts++
          totalUpdates++
        }
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   - Fixed ${fixedProducts} products`)
    console.log(`   - Made ${totalUpdates} database updates`)
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...')
    const { data: verifyImages, error: verifyError } = await supabase
      .from('product_images')
      .select('product_id, is_primary')
    
    if (!verifyError) {
      const productPrimaryCounts = {}
      verifyImages.forEach(img => {
        if (img.is_primary) {
          productPrimaryCounts[img.product_id] = (productPrimaryCounts[img.product_id] || 0) + 1
        }
      })
      
      const conflictingProducts = Object.keys(productPrimaryCounts).filter(id => productPrimaryCounts[id] > 1)
      
      if (conflictingProducts.length === 0) {
        console.log('✅ All products now have exactly one primary image!')
      } else {
        console.log(`⚠️  Still ${conflictingProducts.length} products with multiple primary images:`)
        conflictingProducts.forEach(id => {
          console.log(`   - Product ${id}: ${productPrimaryCounts[id]} primary images`)
        })
      }
    }
    
    console.log('\n✅ Fix complete!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  } finally {
    process.exit(0)
  }
}

fixMultiplePrimaryImages()