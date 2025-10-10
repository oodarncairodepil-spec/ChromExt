const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key
const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function assignRemainingUsers() {
  console.log('=== Assigning remaining users to default seller ===')
  
  try {
    // Get users without user_id
    const { data: usersWithoutUserId, error: usersError } = await supabase
      .from('users')
      .select('id, name, phone')
      .is('user_id', null)
    
    if (usersError) {
      console.error('Error fetching users without user_id:', usersError)
      return
    }
    
    console.log(`Found ${usersWithoutUserId.length} users without user_id:`)
    usersWithoutUserId.forEach(user => {
      console.log(`  - ${user.name} (${user.phone}) - ID: ${user.id}`)
    })
    
    if (usersWithoutUserId.length === 0) {
      console.log('✅ All users already have user_id assigned!')
      return
    }
    
    // Get the first seller as default
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    if (!authUsers || authUsers.users.length === 0) {
      console.error('❌ No sellers found in auth.users')
      return
    }
    
    const defaultSeller = authUsers.users[0]
    console.log(`\nUsing default seller: ${defaultSeller.email} (${defaultSeller.id})`)
    
    // Assign all users without user_id to the default seller
    let assignedCount = 0
    for (const user of usersWithoutUserId) {
      const { data, error } = await supabase
        .from('users')
        .update({ user_id: defaultSeller.id })
        .eq('id', user.id)
        .select('name')
      
      if (error) {
        console.error(`❌ Error assigning ${user.name}:`, error)
      } else if (data && data.length > 0) {
        console.log(`  ✅ Assigned ${data[0].name} to ${defaultSeller.email}`)
        assignedCount++
      }
    }
    
    console.log(`\n📊 Successfully assigned ${assignedCount} users to default seller`)
    
    // Verify final state
    console.log('\n=== Final verification ===')
    const { data: allUsers, error: verifyError } = await supabase
      .from('users')
      .select('id, name, user_id')
      .order('name')
    
    if (verifyError) {
      console.error('Error verifying users:', verifyError)
      return
    }
    
    console.log('All users and their assignments:')
    allUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name}: ${user.user_id ? '✅' : '❌'} ${user.user_id || 'NO USER_ID'}`)
    })
    
    const usersWithUserId = allUsers.filter(u => u.user_id).length
    const usersWithoutUserId2 = allUsers.filter(u => !u.user_id).length
    
    console.log(`\n🎯 Final Summary:`)
    console.log(`   - Users with user_id: ${usersWithUserId}`)
    console.log(`   - Users without user_id: ${usersWithoutUserId2}`)
    
    if (usersWithoutUserId2 === 0) {
      console.log('\n🎉 All users now have user_id assignments!')
      console.log('The Users page should now show all 6 users for the authenticated seller.')
    }
    
  } catch (error) {
    console.error('Error assigning remaining users:', error)
  }
}

// Run the assignment script
assignRemainingUsers()