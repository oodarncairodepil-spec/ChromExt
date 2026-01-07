require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error('Missing environment variables:')
  console.error('PLASMO_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey)
  console.error('PLASMO_PUBLIC_SUPABASE_ANON_KEY:', !!anonKey)
  process.exit(1)
}

async function debugProductImagesAccess() {
  console.log('🔍 Debugging product_images 406 errors...')
  
  const supabaseService = createClient(supabaseUrl, serviceRoleKey)
  const supabaseAnon = createClient(supabaseUrl, anonKey)
  
  // Get all product IDs that are being queried in the logs
  const problematicProductIds = [
    '795929a7-6ca7-487a-86f6-8b3f02874bbf',
    '4cec58e6-2883-4bd7-aa2e-bd970bde4da1',
    'f0e6b47a-1fbd-4e00-b1dd-d634a30c8768',
    '7c56c79a-0e17-411f-b401-e144610c34f6',
    '1fc494e3-c094-49da-bf9e-230722986606'
  ]
  
  console.log('\n1. Testing specific product IDs from error logs:')
  for (const productId of problematicProductIds) {
    console.log(`\nTesting product_id: ${productId}`)
    
    // Check if product exists
    const { data: productExists } = await supabaseService
      .from('products')
      .select('id, name')
      .eq('id', productId)
      .single()
    
    if (!productExists) {
      console.log('❌ Product does not exist in products table')
      continue
    }
    
    console.log(`✅ Product exists: ${productExists.name}`)
    
    // Check if product_images exist for this product
    const { data: images } = await supabaseService
      .from('product_images')
      .select('*')
      .eq('product_id', productId)
    
    console.log(`📸 Found ${images?.length || 0} images for this product`)
    if (images && images.length > 0) {
      console.log('Images:', images.map(img => ({ is_primary: img.is_primary, url: img.image_url.substring(0, 50) + '...' })))
    }
    
    // Test the exact query that's failing
    const { data: primaryImage, error } = await supabaseAnon
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId)
      .eq('is_primary', true)
      .single()
    
    if (error) {
      console.log('❌ Anonymous query error:', error.code, error.message)
    } else {
      console.log('✅ Anonymous query success:', primaryImage?.image_url?.substring(0, 50) + '...')
    }
  }
  
  console.log('\n2. Testing HTTP headers and response codes:')
  try {
    // Simulate the exact request that's causing 406 errors
    const response = await fetch(`${supabaseUrl}/rest/v1/product_images?select=image_url&product_id=eq.795929a7-6ca7-487a-86f6-8b3f02874bbf&is_primary=eq.true`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    
    console.log('HTTP Status:', response.status, response.statusText)
    console.log('Response Headers:')
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`)
    }
    
    const responseText = await response.text()
    console.log('Response Body:', responseText)
    
  } catch (err) {
    console.error('❌ HTTP request error:', err.message)
  }
  
  console.log('\n3. Checking Accept headers compatibility:')
  // Test different Accept headers
  const acceptHeaders = [
    'application/json',
    'application/vnd.pgrst.object+json',
    '*/*',
    'text/plain'
  ]
  
  for (const acceptHeader of acceptHeaders) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/product_images?select=image_url&limit=1`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          'Accept': acceptHeader
        }
      })
      
      console.log(`Accept: ${acceptHeader} -> Status: ${response.status}`)
    } catch (err) {
      console.log(`Accept: ${acceptHeader} -> Error: ${err.message}`)
    }
  }
}

debugProductImagesAccess().catch(console.error)