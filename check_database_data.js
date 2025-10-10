const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseData() {
  console.log('=== Checking Database Data ===')
  
  try {
    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, phone, created_at')
      .order('created_at', { ascending: false })
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
    } else {
      console.log(`\nUsers table: ${users?.length || 0} records`)
      users?.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.phone}) - ${user.id}`)
      })
    }
    
    // Check orders table
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, buyer_id, seller_id, created_at')
      .order('created_at', { ascending: false })
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
    } else {
      console.log(`\nOrders table: ${orders?.length || 0} records`)
      orders?.forEach((order, index) => {
        console.log(`  ${index + 1}. Order ${order.id} - Buyer: ${order.buyer_id}, Seller: ${order.seller_id}`)
      })
    }
    
    // Check auth.users (shop owners)
    const { data: authUsers, error: authError } = await supabase
      .from('user_profiles')
      .select('id, full_name, created_at')
      .order('created_at', { ascending: false })
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
    } else {
      console.log(`\nAuth users (shop owners): ${authUsers?.length || 0} records`)
      authUsers?.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.full_name} - ${user.id}`)
      })
    }
    
    // Check variant_options table structure
    console.log('\n=== Checking variant_options table ===')
    const { data: variantOptions, error: variantError } = await supabase
      .from('variant_options')
      .select('*')
      .limit(1)
    
    if (variantError) {
      console.error('variant_options table error:', variantError.message)
    } else {
      console.log('variant_options table exists and accessible')
      if (variantOptions && variantOptions.length > 0) {
        console.log('Sample record columns:', Object.keys(variantOptions[0]))
      }
    }
    
    // Check product_variants table structure
    console.log('\n=== Checking product_variants table ===')
    const { data: productVariants, error: productVariantsError } = await supabase
      .from('product_variants')
      .select('*')
      .limit(1)
    
    if (productVariantsError) {
      console.error('product_variants table error:', productVariantsError.message)
    } else {
      console.log('product_variants table exists and accessible')
      if (productVariants && productVariants.length > 0) {
        console.log('Sample record columns:', Object.keys(productVariants[0]))
      }
    }
    
  } catch (error) {
    console.error('General error:', error)
  }
}

checkDatabaseData()