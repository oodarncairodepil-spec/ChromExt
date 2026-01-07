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
  console.log('\n📋 Manual steps to add notes columns:')
  console.log('1. Go to your Supabase dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Copy and paste the following SQL:')
  console.log('\n--- SQL TO EXECUTE ---')
  try {
    const sqlPath = path.join(__dirname, 'add-notes-columns.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log(sql)
  } catch (error) {
    console.log('Could not read SQL file:', error.message)
  }
  console.log('--- END SQL ---\n')
  console.log('4. Click "Run" to execute the script')
  console.log('5. Restart your development server: npm run dev')
  process.exit(0)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runNotesMigration() {
  try {
    console.log('Running notes migration...')
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add-notes-columns.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })
    
    if (error) {
      console.error('Migration failed:', error)
      console.log('\n📋 Please execute the SQL manually:')
      console.log('1. Go to your Supabase dashboard')
      console.log('2. Navigate to SQL Editor')
      console.log('3. Copy and paste the following SQL:')
      console.log('\n--- SQL TO EXECUTE ---')
      console.log(sql)
      console.log('--- END SQL ---\n')
      process.exit(1)
    }
    
    console.log('✅ Notes migration completed successfully!')
    console.log('Added columns:')
    console.log('- orders.order_notes (TEXT)')
    console.log('- products.has_notes (BOOLEAN DEFAULT false)')
    console.log('- cart_items.notes (TEXT)')
    
  } catch (error) {
    console.error('Error running migration:', error)
    process.exit(1)
  }
}

runNotesMigration()