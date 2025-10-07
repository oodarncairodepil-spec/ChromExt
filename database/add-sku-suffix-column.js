require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addSkuSuffixColumn() {
  try {
    console.log('Adding sku_suffix column to product_variants table...')
    
    // Use a simple approach - try to insert a test record with sku_suffix
    // If it fails, we know the column doesn't exist
    const testRecord = {
      product_id: '00000000-0000-0000-0000-000000000000', // This will fail due to foreign key, but that's ok
      full_product_name: 'test',
      price: 1.00,
      sku_suffix: 'TEST'
    }
    
    const { data, error } = await supabase
      .from('product_variants')
      .insert([testRecord])
      .select()
    
    if (error) {
      if (error.message.includes('sku_suffix')) {
        console.log('sku_suffix column does not exist. The schema needs to be updated manually.')
        console.log('\nPlease go to your Supabase project dashboard:')
        console.log('1. Navigate to SQL Editor')
        console.log('2. Run this SQL command:')
        console.log('   ALTER TABLE product_variants ADD COLUMN sku_suffix VARCHAR(100);')
        console.log('\nOr run the full migration:')
        console.log('   Copy and paste the contents of supabase/migrations/20251006114215_fix_variant_tables_schema.sql')
      } else {
        console.log('Column exists but insert failed (expected):', error.message)
        console.log('This means sku_suffix column is available!')
      }
    } else {
      console.log('Unexpected success - cleaning up test record...')
      // Clean up if somehow it succeeded
      if (data && data[0]) {
        await supabase.from('product_variants').delete().eq('id', data[0].id)
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

addSkuSuffixColumn()