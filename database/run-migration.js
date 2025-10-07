require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('Checking current schema and running migration if needed...')
    
    // First, let's check if the tables exist and what columns they have
    console.log('Checking product_variants table...')
    const { data: pvData, error: pvError } = await supabase
      .from('product_variants')
      .select('*')
      .limit(1)
    
    if (pvError) {
      console.log('product_variants table does not exist or has issues:', pvError.message)
    } else {
      console.log('product_variants table exists')
    }
    
    // Check variant_options table
    console.log('Checking variant_options table...')
    const { data: voData, error: voError } = await supabase
      .from('variant_options')
      .select('*')
      .limit(1)
    
    if (voError) {
      console.log('variant_options table does not exist or has issues:', voError.message)
    } else {
      console.log('variant_options table exists')
    }
    
    // Try to test the sku_suffix column specifically
    console.log('Testing sku_suffix column...')
    const { data: testData, error: testError } = await supabase
      .from('product_variants')
      .select('sku_suffix')
      .limit(1)
    
    if (testError) {
      console.log('sku_suffix column issue:', testError.message)
      console.log('\nThe database schema needs to be updated manually.')
      console.log('Please run the following SQL in your Supabase SQL Editor:')
      console.log('\n-- Add sku_suffix column if it does not exist')
      console.log('ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS sku_suffix VARCHAR(100);')
      console.log('\n-- Or recreate the table with correct schema:')
      console.log('-- (Make sure to backup any existing data first!)')
      console.log('DROP TABLE IF EXISTS variant_options CASCADE;')
      console.log('DROP TABLE IF EXISTS product_variants CASCADE;')
      console.log('\n-- Then run the migration file: 20251006114215_fix_variant_tables_schema.sql')
    } else {
      console.log('sku_suffix column exists - schema is correct!')
    }
    
  } catch (error) {
    console.error('Migration check failed:', error)
  }
}

runMigration()