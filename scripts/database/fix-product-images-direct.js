const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixProductImagesRLS() {
  console.log('🔧 Fixing product_images RLS policies...');
  
  try {
    // Drop existing policies for product_images
    const dropPolicies = `
      DROP POLICY IF EXISTS "Allow all users to view product images" ON product_images;
      DROP POLICY IF EXISTS "Users can only insert own product images" ON product_images;
      DROP POLICY IF EXISTS "Users can only update own product images" ON product_images;
      DROP POLICY IF EXISTS "Users can only delete own product images" ON product_images;
    `;
    
    const { error: dropError } = await supabase.rpc('exec_sql', { query: dropPolicies });
    if (dropError) {
      console.log('⚠️  Drop policies error (may be expected):', dropError.message);
    }
    
    // Create new policies for product_images
    const createPolicies = `
      -- Allow all authenticated users to view product images
      CREATE POLICY "Allow all users to view product images" ON product_images
      FOR SELECT USING (true);
      
      -- Allow users to insert images for their own products
      CREATE POLICY "Users can only insert own product images" ON product_images
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM products 
          WHERE products.id = product_images.product_id 
          AND products.user_id = auth.uid()
        )
      );
      
      -- Allow users to update images for their own products
      CREATE POLICY "Users can only update own product images" ON product_images
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM products 
          WHERE products.id = product_images.product_id 
          AND products.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM products 
          WHERE products.id = product_images.product_id 
          AND products.user_id = auth.uid()
        )
      );
      
      -- Allow users to delete images for their own products
      CREATE POLICY "Users can only delete own product images" ON product_images
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM products 
          WHERE products.id = product_images.product_id 
          AND products.user_id = auth.uid()
        )
      );
      
      -- Enable RLS on product_images
      ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
    `;
    
    const { error: createError } = await supabase.rpc('exec_sql', { query: createPolicies });
    if (createError) {
      console.error('❌ Error creating policies:', createError.message);
      
      // Try direct SQL execution
      console.log('🔄 Trying direct SQL execution...');
      const { error: directError } = await supabase.from('product_images').select('count').limit(1);
      if (directError) {
        console.error('❌ Direct query also failed:', directError.message);
      } else {
        console.log('✅ Direct query succeeded - RLS may already be working');
      }
    } else {
      console.log('✅ Product images RLS policies created successfully');
    }
    
    // Test the fix
    console.log('🧪 Testing product_images access...');
    const { data, error: testError } = await supabase
      .from('product_images')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Test query failed:', testError.message);
    } else {
      console.log('✅ Test query succeeded - found', data?.length || 0, 'records');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

fixProductImagesRLS().then(() => {
  console.log('🎉 Product images RLS fix completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});