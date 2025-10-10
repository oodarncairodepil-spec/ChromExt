const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key
const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function addUserIdColumns() {
  console.log('=== Adding user_id columns to variant tables ===')
  
  try {
    // Step 1: Add user_id column to variant_options
    console.log('\n1. Adding user_id column to variant_options table...')
    const { error: addCol1 } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE variant_options ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;'
    })
    
    if (addCol1 && !addCol1.message.includes('already exists')) {
      console.error('Error adding user_id to variant_options:', addCol1)
    } else {
      console.log('✅ user_id column added to variant_options')
    }
    
    // Step 2: Add user_id column to product_variants
    console.log('\n2. Adding user_id column to product_variants table...')
    const { error: addCol2 } = await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;'
    })
    
    if (addCol2 && !addCol2.message.includes('already exists')) {
      console.error('Error adding user_id to product_variants:', addCol2)
    } else {
      console.log('✅ user_id column added to product_variants')
    }
    
    // Step 3: Update existing records in variant_options
    console.log('\n3. Updating existing variant_options records...')
    const { error: update1 } = await supabase.rpc('exec_sql', {
      sql_query: `
        UPDATE variant_options 
        SET user_id = products.user_id 
        FROM products 
        WHERE variant_options.product_id = products.id 
        AND variant_options.user_id IS NULL;
      `
    })
    
    if (update1) {
      console.error('Error updating variant_options:', update1)
    } else {
      console.log('✅ variant_options records updated')
    }
    
    // Step 4: Update existing records in product_variants
    console.log('\n4. Updating existing product_variants records...')
    const { error: update2 } = await supabase.rpc('exec_sql', {
      sql_query: `
        UPDATE product_variants 
        SET user_id = products.user_id 
        FROM products 
        WHERE product_variants.product_id = products.id 
        AND product_variants.user_id IS NULL;
      `
    })
    
    if (update2) {
      console.error('Error updating product_variants:', update2)
    } else {
      console.log('✅ product_variants records updated')
    }
    
    // Step 5: Create indexes
    console.log('\n5. Creating indexes...')
    const { error: idx1 } = await supabase.rpc('exec_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_variant_options_user_id ON variant_options(user_id);'
    })
    
    const { error: idx2 } = await supabase.rpc('exec_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_product_variants_user_id ON product_variants(user_id);'
    })
    
    if (!idx1 && !idx2) {
      console.log('✅ Indexes created successfully')
    }
    
  } catch (error) {
    console.error('Migration failed:', error)
  }
}

async function verifyChanges() {
  console.log('\n=== Verifying changes ===')
  
  try {
    // Check if columns exist
    const { data: voColumns } = await supabase
      .from('variant_options')
      .select('*')
      .limit(1)
    
    const { data: pvColumns } = await supabase
      .from('product_variants')
      .select('*')
      .limit(1)
    
    if (voColumns && voColumns[0]) {
      const hasUserIdVO = 'user_id' in voColumns[0]
      console.log(`variant_options has user_id column: ${hasUserIdVO ? '✅' : '❌'}`)
    }
    
    if (pvColumns && pvColumns[0]) {
      const hasUserIdPV = 'user_id' in pvColumns[0]
      console.log(`product_variants has user_id column: ${hasUserIdPV ? '✅' : '❌'}`)
    }
    
    console.log('\n✅ Migration verification completed!')
    console.log('\nBenefits of adding user_id columns:')
    console.log('1. 🚀 Direct filtering without JOIN operations (better performance)')
    console.log('2. 🔒 Simplified and more secure RLS policies')
    console.log('3. 📊 Easier data isolation per user')
    console.log('4. 🔍 Faster queries with dedicated indexes')
    console.log('5. 🛡️ Better data security and access control')
    
  } catch (error) {
    console.error('Verification failed:', error)
  }
}

// Run the migration
addUserIdColumns().then(() => {
  verifyChanges()
})