const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
)

async function diagnoseImageIssue() {
  try {
    console.log('🔍 Diagnosing product image display issues...')
    
    // 1. Check product_images table structure and data
    console.log('\n1. Checking product_images table:')
    const { data: productImages, error: productImagesError } = await supabase
      .from('product_images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (productImagesError) {
      console.log('❌ Error querying product_images:', productImagesError)
    } else {
      console.log(`✅ Found ${productImages.length} recent product images:`)
      productImages.forEach((img, index) => {
        console.log(`   ${index + 1}. Product ID: ${img.product_id}`)
        console.log(`      Image URL: ${img.image_url}`)
        console.log(`      Is Primary: ${img.is_primary}`)
        console.log(`      Created: ${img.created_at}`)
        console.log('')
      })
    }
    
    // 2. Check for products with multiple images
    console.log('\n2. Checking products with multiple images:')
    const { data: multiImageProducts, error: multiError } = await supabase
      .rpc('get_products_with_multiple_images')
    
    if (multiError) {
      console.log('❌ RPC function not available, checking manually...')
      
      // Manual check for products with multiple images
      const { data: allImages, error: allImagesError } = await supabase
        .from('product_images')
        .select('product_id')
      
      if (!allImagesError) {
        const productCounts = {}
        allImages.forEach(img => {
          productCounts[img.product_id] = (productCounts[img.product_id] || 0) + 1
        })
        
        const multiImageProductIds = Object.keys(productCounts).filter(id => productCounts[id] > 1)
        console.log(`✅ Found ${multiImageProductIds.length} products with multiple images`)
        
        for (const productId of multiImageProductIds.slice(0, 3)) {
          const { data: productImages, error } = await supabase
            .from('product_images')
            .select('image_url, is_primary')
            .eq('product_id', productId)
          
          if (!error) {
            console.log(`   Product ${productId}: ${productImages.length} images`)
            productImages.forEach((img, idx) => {
              console.log(`     ${idx + 1}. ${img.is_primary ? '[PRIMARY]' : '[SECONDARY]'} ${img.image_url.substring(0, 60)}...`)
            })
          }
        }
      }
    }
    
    // 3. Check for primary image conflicts
    console.log('\n3. Checking for primary image conflicts:')
    const { data: primaryConflicts, error: conflictError } = await supabase
      .from('product_images')
      .select('product_id, count(*)')
      .eq('is_primary', true)
      .group('product_id')
      .having('count(*) > 1')
    
    if (conflictError) {
      console.log('❌ Error checking primary conflicts:', conflictError)
    } else if (primaryConflicts && primaryConflicts.length > 0) {
      console.log(`⚠️  Found ${primaryConflicts.length} products with multiple primary images`)
      primaryConflicts.forEach(conflict => {
        console.log(`   Product ${conflict.product_id}: ${conflict.count} primary images`)
      })
    } else {
      console.log('✅ No primary image conflicts found')
    }
    
    // 4. Check for products without primary images
    console.log('\n4. Checking products without primary images:')
    const { data: productsWithImages, error: productsError } = await supabase
      .from('product_images')
      .select('product_id')
      .eq('is_primary', false)
    
    if (!productsError && productsWithImages) {
      const nonPrimaryProductIds = [...new Set(productsWithImages.map(p => p.product_id))]
      console.log(`✅ Found ${nonPrimaryProductIds.length} products with only non-primary images`)
      
      for (const productId of nonPrimaryProductIds.slice(0, 3)) {
        const { data: product, error: productError } = await supabase
          .from('products')
          .select('name')
          .eq('id', productId)
          .single()
        
        if (!productError) {
          console.log(`   - ${product.name} (${productId}): No primary image set`)
        }
      }
    }
    
    // 5. Test image URL accessibility
    console.log('\n5. Testing image URL accessibility:')
    const { data: sampleImages, error: sampleError } = await supabase
      .from('product_images')
      .select('image_url, product_id')
      .limit(3)
    
    if (!sampleError && sampleImages) {
      for (const img of sampleImages) {
        try {
          const response = await fetch(img.image_url, { method: 'HEAD' })
          console.log(`   ${img.image_url.substring(0, 60)}... - Status: ${response.status}`)
        } catch (error) {
          console.log(`   ${img.image_url.substring(0, 60)}... - Error: ${error.message}`)
        }
      }
    }
    
    console.log('\n✅ Diagnosis complete!')
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error)
  } finally {
    process.exit(0)
  }
}

diagnoseImageIssue()