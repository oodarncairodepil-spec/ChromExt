const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key
const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUsersDataIntegrity() {
  console.log('=== Checking Users Table Data Integrity ===')
  
  try {
    // Check all users and their user_id values
    console.log('\n1. Checking all users and their user_id values...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, phone, user_id')
      .order('created_at')
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }
    
    console.log(`Found ${users.length} users:`)
    users.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.phone}):`)
      console.log(`     - ID: ${user.id}`)
      console.log(`     - user_id: ${user.user_id || 'NULL ❌'}`)
    })
    
    // Count users with and without user_id
    const usersWithUserId = users.filter(u => u.user_id).length
    const usersWithoutUserId = users.filter(u => !u.user_id).length
    
    console.log(`\n📊 Summary:`)
    console.log(`   - Users with user_id: ${usersWithUserId}`)
    console.log(`   - Users without user_id: ${usersWithoutUserId}`)
    
    if (usersWithoutUserId > 0) {
      console.log('\n⚠️  Some users are missing user_id values!')
      console.log('This means they are not properly associated with any shop owner.')
    }
    
    // Check auth.users to see available shop owners
    console.log('\n2. Checking available shop owners (auth.users)...')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
    } else {
      console.log(`Found ${authUsers.users.length} shop owners:`)
      authUsers.users.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} (ID: ${user.id})`)
      })
    }
    
    // Check orders to see the relationship
    console.log('\n3. Checking orders to understand user relationships...')
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, seller_id, buyer_id')
      .not('buyer_id', 'is', null)
      .limit(10)
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
    } else {
      console.log(`Found ${orders.length} orders with buyer_id:`)
      orders.forEach((order, index) => {
        console.log(`  ${index + 1}. Order ${order.id}:`)
        console.log(`     - seller_id: ${order.seller_id}`)
        console.log(`     - buyer_id: ${order.buyer_id}`)
      })
      
      // Find which users are actually customers of which sellers
      const buyerIds = [...new Set(orders.map(o => o.buyer_id))]
      const sellerIds = [...new Set(orders.map(o => o.seller_id))]
      
      console.log(`\n📈 Analysis:`)
      console.log(`   - Unique buyers in orders: ${buyerIds.length}`)
      console.log(`   - Unique sellers in orders: ${sellerIds.length}`)
      
      // Check if buyers exist in users table
      const { data: buyerUsers } = await supabase
        .from('users')
        .select('id, name, user_id')
        .in('id', buyerIds)
      
      console.log(`\n4. Matching buyers with users table:`)
      buyerUsers.forEach(user => {
        const userOrders = orders.filter(o => o.buyer_id === user.id)
        const sellers = [...new Set(userOrders.map(o => o.seller_id))]
        console.log(`   - ${user.name} (${user.id}):`)
        console.log(`     - Current user_id: ${user.user_id || 'NULL'}`)
        console.log(`     - Should belong to seller(s): ${sellers.join(', ')}`)
      })
    }
    
  } catch (error) {
    console.error('Error checking data integrity:', error)
  }
}

// Run the integrity check
checkUsersDataIntegrity()