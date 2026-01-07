const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugProductImages() {
  try {
    console.log('🔍 Debugging product images...')
    
    // Check if product_images table exists and has data
    console.log('\n1. Checking product_images table:')
    const { data: productImages, error: productImagesError } = await supabase
      .from('product_images')
      .select('*')
      .limit(10)
    
    if (productImagesError) {
      console.log('❌ Error querying product_images:', productImagesError)
    } else {
      console.log(`✅ Found ${productImages.length} records in product_images table`)
      productImages.forEach((img, index) => {
        console.log(`   ${index + 1}. Product ID: ${img.product_id}`)
        console.log(`      Image URL: ${img.image_url.substring(0, 80)}...`)
        console.log(`      Is Primary: ${img.is_primary}`)
        console.log(`      Created: ${img.created_at}`)
        console.log('')
      })
    }
    
    // Check products table for legacy image data
    console.log('\n2. Checking products table for legacy images:')
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name, image')
      .not('image', 'is', null)
      .limit(10)
    
    if (productsError) {
      console.log('❌ Error querying products:', productsError)
    } else {
      console.log(`✅ Found ${products.length} products with legacy image data`)
      products.forEach((product, index) => {
        console.log(`   ${index + 1}. Product: ${product.name}`)
        console.log(`      ID: ${product.id}`)
        console.log(`      Image: ${product.image ? product.image.substring(0, 80) + '...' : 'null'}`)
        console.log('')
      })
    }
    
    // Check for products without any images
    console.log('\n3. Checking products without images:')
    const { data: productsWithoutImages, error: noImagesError } = await supabase
      .from('products')
      .select('id, name')
      .is('image', null)
      .limit(5)
    
    if (noImagesError) {
      console.log('❌ Error querying products without images:', noImagesError)
    } else {
      console.log(`✅ Found ${productsWithoutImages.length} products without legacy images`)
      
      // For each product without legacy image, check if it has entries in product_images
      for (const product of productsWithoutImages) {
        const { data: hasProductImages, error } = await supabase
          .from('product_images')
          .select('image_url, is_primary')
          .eq('product_id', product.id)
        
        if (!error && hasProductImages.length > 0) {
          console.log(`   - ${product.name} (${product.id}): Has ${hasProductImages.length} images in product_images table`)
        } else {
          console.log(`   - ${product.name} (${product.id}): No images found anywhere`)
        }
      }
    }
    
    // Check for broken or placeholder URLs
    console.log('\n4. Checking for broken or placeholder URLs:')
    const { data: allImages, error: allImagesError } = await supabase
      .from('product_images')
      .select('product_id, image_url')
    
    if (!allImagesError && allImages) {
      const brokenUrls = allImages.filter(img => 
        img.image_url.includes('placeholder.com') || 
        img.image_url.includes('via.placeholder') ||
        img.image_url.includes('broken') ||
        !img.image_url.startsWith('http')
      )
      
      console.log(`✅ Found ${brokenUrls.length} potentially broken URLs out of ${allImages.length} total images`)
      brokenUrls.forEach((img, index) => {
        console.log(`   ${index + 1}. Product ID: ${img.product_id}`)
        console.log(`      Broken URL: ${img.image_url}`)
      })
    }
    
    console.log('\n🔍 Debug completed!')
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

debugProductImages()