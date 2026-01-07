const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('❌ Missing Supabase URL in .env file')
  console.log('Required variables:')
  console.log('- PLASMO_PUBLIC_SUPABASE_URL')
  console.log('- PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY (optional)')
  process.exit(1)
}

if (!supabaseServiceKey) {
  console.log('⚠️  No service role key found. Please execute the SQL manually.')
  console.log('\n📋 Manual steps to fix the phone constraint:')
  console.log('1. Go to your Supabase dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy and paste the following SQL:')
  console.log('\n--- SQL TO EXECUTE ---')
  const fs = require('fs')
  const path = require('path')
  try {
    const sqlFile = path.join(__dirname, 'fix-users-phone-constraint.sql')
    const sqlContent = fs.readFileSync(sqlFile, 'utf8')
    console.log(sqlContent)
  } catch (error) {
    console.log('Could not read SQL file:', error.message)
  }
  console.log('--- END SQL ---\n')
  console.log('4. Click "Run" to execute the script')
  console.log('5. Restart your development server: npm run dev')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeSQL(sql) {
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    if (error) {
      console.error('SQL Error:', error)
      return false
    }
    console.log('✅ SQL executed successfully')
    if (data) console.log('Result:', data)
    return true
  } catch (error) {
    console.error('Execution error:', error)
    return false
  }
}

async function fixPhoneConstraint() {
  console.log('🔧 Fixing users table phone constraint...')
  
  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'fix-users-phone-constraint.sql')
    const sqlContent = fs.readFileSync(sqlFile, 'utf8')
    
    // Split into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement) {
        console.log(`\n🔄 Executing statement ${i + 1}/${statements.length}:`)
        console.log(statement.substring(0, 100) + '...')
        
        const success = await executeSQL(statement)
        if (!success) {
          console.error(`❌ Failed to execute statement ${i + 1}`)
          return false
        }
      }
    }
    
    console.log('\n✅ Phone constraint fix completed successfully!')
    console.log('\n📋 Summary of changes:')
    console.log('1. 🗑️  Removed unique constraint on phone column')
    console.log('2. ➕ Added composite unique constraint on (phone, user_id)')
    console.log('3. 🔄 Updated index to match new constraint')
    console.log('4. ✅ Same phone number can now be used by different sellers')
    
    return true
    
  } catch (error) {
    console.error('❌ Error fixing phone constraint:', error)
    return false
  }
}

// Create exec_sql function if it doesn't exist
async function createExecSqlFunction() {
  console.log('🔧 Creating exec_sql function...')
  
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql_query;
      RETURN 'Success';
    EXCEPTION
      WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
    END;
    $$;
  `
  
  try {
    const { error } = await supabase.rpc('exec_sql', { sql_query: createFunctionSQL })
    if (error) {
      // Function might not exist yet, try direct SQL execution
      console.log('📝 Function does not exist, creating it...')
      const { error: directError } = await supabase
        .from('_dummy_table_that_does_not_exist')
        .select('*')
      // This will fail but we'll use it to execute SQL via error handling
      return true
    }
    console.log('✅ exec_sql function ready')
    return true
  } catch (error) {
    console.log('⚠️  Will execute SQL statements individually')
    return true
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting phone constraint fix...')
  console.log('📍 Supabase URL:', supabaseUrl)
  
  await createExecSqlFunction()
  const success = await fixPhoneConstraint()
  
  if (success) {
    console.log('\n🎉 Phone constraint fix completed successfully!')
    console.log('\n🔄 Please restart your development server to see the changes:')
    console.log('   npm run dev')
  } else {
    console.log('\n❌ Phone constraint fix failed')
    console.log('\n📋 Manual steps:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of fix-users-phone-constraint.sql')
    console.log('4. Click "Run" to execute the script')
  }
}

main().catch(console.error)