const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixBrokenImageUrls() {
  try {
    console.log('🔧 Fixing broken image URLs...')
    
    // Find all broken or invalid image URLs
    const { data: allImages, error: fetchError } = await supabase
      .from('product_images')
      .select('id, product_id, image_url, is_primary')
    
    if (fetchError) {
      console.error('❌ Error fetching images:', fetchError)
      return
    }
    
    console.log(`Found ${allImages.length} total images to check`)
    
    const brokenImages = allImages.filter(img => {
      const url = img.image_url
      return (
        !url || 
        url.length < 10 || // Very short URLs are likely broken
        url === 'i' || // Specific broken case we found
        url.includes('undefined') ||
        url.includes('null') ||
        (!url.startsWith('http') && !url.startsWith('data:')) ||
        url.includes('placeholder.com') ||
        url.includes('via.placeholder')
      )
    })
    
    console.log(`Found ${brokenImages.length} broken image URLs:`)
    
    for (const brokenImage of brokenImages) {
      console.log(`\n🔍 Processing broken image:`)
      console.log(`   ID: ${brokenImage.id}`)
      console.log(`   Product ID: ${brokenImage.product_id}`)
      console.log(`   Broken URL: "${brokenImage.image_url}"`)
      console.log(`   Is Primary: ${brokenImage.is_primary}`)
      
      // Get product name for context
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name')
        .eq('id', brokenImage.product_id)
        .single()
      
      if (!productError && product) {
        console.log(`   Product Name: ${product.name}`)
      }
      
      // Option 1: Delete the broken image entry
      console.log('   Action: Deleting broken image entry...')
      const { error: deleteError } = await supabase
        .from('product_images')
        .delete()
        .eq('id', brokenImage.id)
      
      if (deleteError) {
        console.error(`   ❌ Error deleting broken image: ${deleteError.message}`)
      } else {
        console.log('   ✅ Deleted broken image entry')
      }
    }
    
    // Check for products that now have no images
    console.log('\n🔍 Checking for products without any images after cleanup...')
    
    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, name')
    
    if (productsError) {
      console.error('❌ Error fetching products:', productsError)
      return
    }
    
    let productsWithoutImages = 0
    
    for (const product of allProducts) {
      const { data: productImages, error: imageError } = await supabase
        .from('product_images')
        .select('id')
        .eq('product_id', product.id)
      
      if (!imageError && productImages.length === 0) {
        productsWithoutImages++
        console.log(`   - ${product.name} (${product.id}): No images`)
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   - Fixed ${brokenImages.length} broken image URLs`)
    console.log(`   - ${productsWithoutImages} products now have no images`)
    console.log(`   - ${allProducts.length - productsWithoutImages} products have valid images`)
    
    console.log('\n✅ Broken image URL fix completed!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixBrokenImageUrls()