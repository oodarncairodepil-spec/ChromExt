const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key
const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function addUserIdToUsersTable() {
  console.log('=== Adding user_id column to users table ===')
  
  try {
    // Step 1: Add user_id column to users table
    console.log('\n1. Adding user_id column to users table...')
    const { data: addCol, error: addColError } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    // Check if user_id column already exists
    if (addCol && addCol[0] && 'user_id' in addCol[0]) {
      console.log('✅ user_id column already exists in users table')
    } else {
      console.log('❌ user_id column does not exist, need to add it via SQL')
      console.log('Note: This requires direct SQL execution in Supabase dashboard')
    }
    
    // Step 2: Check current table structure
    console.log('\n2. Checking current users table structure...')
    const { data: sampleUser } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (sampleUser && sampleUser[0]) {
      console.log('Current users table columns:')
      Object.keys(sampleUser[0]).forEach(col => {
        console.log(`  - ${col}`)
      })
    }
    
    // Step 3: Count existing records
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    console.log(`\n3. Current users table has ${userCount} records`)
    
    console.log('\n=== Migration Instructions ===')
    console.log('To complete this migration, please:')
    console.log('1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Execute the SQL from add-user-id-to-users-table.sql')
    console.log('3. This will:')
    console.log('   - Add user_id column referencing auth.users(id)')
    console.log('   - Create proper RLS policies for data isolation')
    console.log('   - Add trigger to auto-set user_id on new inserts')
    console.log('   - Create index for better performance')
    
  } catch (error) {
    console.error('Error checking users table:', error)
  }
}

async function verifyUsersTableStructure() {
  console.log('\n=== Verifying users table structure ===')
  
  try {
    // Check if user_id column exists
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .limit(1)
    
    if (users && users[0]) {
      const hasUserId = 'user_id' in users[0]
      console.log(`users table has user_id column: ${hasUserId ? '✅' : '❌'}`)
      
      if (hasUserId) {
        console.log('\n✅ Migration completed successfully!')
        console.log('\nBenefits of adding user_id to users table:')
        console.log('1. 🔒 Proper data isolation between shop owners')
        console.log('2. 🚀 Direct filtering without complex joins')
        console.log('3. 📊 Each shop owner sees only their customers')
        console.log('4. 🛡️ Enhanced security with RLS policies')
        console.log('5. 🔍 Faster queries with dedicated indexes')
      } else {
        console.log('\n❌ Migration not yet applied')
        console.log('Please execute the SQL script in Supabase Dashboard')
      }
    }
    
  } catch (error) {
    console.error('Verification failed:', error)
  }
}

// Run the migration check
addUserIdToUsersTable().then(() => {
  verifyUsersTableStructure()
})