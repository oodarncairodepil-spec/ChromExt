const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key
const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function populateUsersUserId() {
  console.log('=== Populating user_id values in users table ===')
  
  try {
    // Step 1: Get all orders with buyer_id to understand customer-seller relationships
    console.log('\n1. Analyzing customer-seller relationships from orders...')
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('seller_id, buyer_id')
      .not('buyer_id', 'is', null)
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return
    }
    
    // Create a map of buyer_id -> seller_id
    const buyerToSellerMap = {}
    orders.forEach(order => {
      if (order.buyer_id && order.seller_id) {
        buyerToSellerMap[order.buyer_id] = order.seller_id
      }
    })
    
    console.log('Customer-Seller relationships found:')
    Object.entries(buyerToSellerMap).forEach(([buyerId, sellerId]) => {
      console.log(`  - Customer ${buyerId} belongs to Seller ${sellerId}`)
    })
    
    // Step 2: Update users table with the correct user_id values
    console.log('\n2. Updating users table with user_id values...')
    
    let updatedCount = 0
    for (const [buyerId, sellerId] of Object.entries(buyerToSellerMap)) {
      const { data, error } = await supabase
        .from('users')
        .update({ user_id: sellerId })
        .eq('id', buyerId)
        .select('name')
      
      if (error) {
        console.error(`Error updating user ${buyerId}:`, error)
      } else if (data && data.length > 0) {
        console.log(`  ✅ Updated ${data[0].name} (${buyerId}) -> user_id: ${sellerId}`)
        updatedCount++
      }
    }
    
    console.log(`\n📊 Updated ${updatedCount} users with user_id values`)
    
    // Step 3: Handle remaining users without orders
    console.log('\n3. Checking users without orders...')
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, user_id')
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return
    }
    
    const usersWithoutUserId = allUsers.filter(user => !user.user_id)
    console.log(`Found ${usersWithoutUserId.length} users without user_id:`)
    
    usersWithoutUserId.forEach(user => {
      console.log(`  - ${user.name} (${user.id}) - No orders found`)
    })
    
    if (usersWithoutUserId.length > 0) {
      console.log('\n💡 Suggestion for users without orders:')
      console.log('These users can be assigned to a default seller or left unassigned.')
      console.log('You can manually assign them in the Supabase dashboard if needed.')
      
      // Get the first seller as default (optional)
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      if (authUsers && authUsers.users.length > 0) {
        const defaultSeller = authUsers.users[0]
        console.log(`\nTo assign them to default seller (${defaultSeller.email}), run:`)
        console.log(`UPDATE users SET user_id = '${defaultSeller.id}' WHERE user_id IS NULL;`)
      }
    }
    
    // Step 4: Verify the results
    console.log('\n4. Verifying updated users table...')
    const { data: updatedUsers, error: verifyError } = await supabase
      .from('users')
      .select('id, name, user_id')
      .order('name')
    
    if (verifyError) {
      console.error('Error verifying users:', verifyError)
      return
    }
    
    console.log('\nFinal users table state:')
    updatedUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name}:`)
      console.log(`     - ID: ${user.id}`)
      console.log(`     - user_id: ${user.user_id || 'NULL ❌'}`)
    })
    
    const finalUsersWithUserId = updatedUsers.filter(u => u.user_id).length
    const finalUsersWithoutUserId = updatedUsers.filter(u => !u.user_id).length
    
    console.log(`\n✅ Final Summary:`)
    console.log(`   - Users with user_id: ${finalUsersWithUserId}`)
    console.log(`   - Users without user_id: ${finalUsersWithoutUserId}`)
    
    if (finalUsersWithUserId > 0) {
      console.log('\n🎉 Success! Users now have proper user_id associations.')
      console.log('This will fix the Users page to show only relevant customers for each seller.')
    }
    
  } catch (error) {
    console.error('Error populating user_id values:', error)
  }
}

// Run the population script
populateUsersUserId()