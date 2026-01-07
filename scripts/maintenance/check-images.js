require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
)

async function checkImages() {
  console.log('🔍 Checking product_images table...')
  
  const { data, error } = await supabase
    .from('product_images')
    .select('product_id, image_url, is_primary')
    .order('product_id')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Total images:', data.length)
  
  const productGroups = {}
  data.forEach(img => {
    if (!productGroups[img.product_id]) {
      productGroups[img.product_id] = []
    }
    productGroups[img.product_id].push(img)
  })
  
  Object.entries(productGroups).forEach(([productId, images]) => {
    const primaryCount = images.filter(img => img.is_primary).length
    console.log(`Product ${productId.substring(0,8)}...: ${images.length} images, ${primaryCount} primary`)
    
    if (primaryCount === 0) {
      console.log(`  ⚠️  No primary image for product ${productId}`)
    } else if (primaryCount > 1) {
      console.log(`  ⚠️  Multiple primary images for product ${productId}`)
    }
  })
  
  // Check for any broken URLs
  const brokenUrls = data.filter(img => 
    !img.image_url || 
    img.image_url.length < 10 || 
    img.image_url === 'i' || 
    img.image_url === 'undefined' || 
    img.image_url === 'null'
  )
  
  if (brokenUrls.length > 0) {
    console.log('\n🚨 Found broken image URLs:')
    brokenUrls.forEach(img => {
      console.log(`  Product ${img.product_id}: "${img.image_url}"`)
    })
  } else {
    console.log('\n✅ No broken image URLs found')
  }
}

checkImages().catch(console.error)