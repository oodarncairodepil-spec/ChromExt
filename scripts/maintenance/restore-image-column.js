require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations
const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function restoreImageColumn() {
  try {
    console.log('Restoring image column to products table...');
    
    // First, let's check current schema
    const { data: beforeData, error: beforeError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (beforeError) {
      console.error('Error checking current schema:', beforeError);
      return;
    }
    
    if (beforeData && beforeData.length > 0) {
      console.log('Current columns before adding image column:');
      console.log(Object.keys(beforeData[0]));
      
      if ('image' in beforeData[0]) {
        console.log('✅ Image column already exists!');
        return;
      }
    }
    
    console.log('\nAdding image column to products table...');
    
    // Execute SQL to add the image column
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE products ADD COLUMN image TEXT;'
    });
    
    if (error) {
      console.error('Error adding image column via RPC:', error);
      console.log('\nTrying alternative approach...');
      
      // Alternative: Try using a direct SQL query
      // Note: This might not work with the anon key, but let's try
      const { error: directError } = await supabase
        .from('products')
        .select('image') // This will fail if column doesn't exist
        .limit(0);
      
      if (directError && directError.message.includes('column "image" does not exist')) {
        console.log('\n❌ Cannot add column via JavaScript client.');
        console.log('\n📋 MANUAL STEPS REQUIRED:');
        console.log('1. Go to your Supabase project dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run this SQL command:');
        console.log('\n   ALTER TABLE products ADD COLUMN image TEXT;');
        console.log('\n4. Optionally add a comment:');
        console.log('   COMMENT ON COLUMN products.image IS \'URL of the product image\';');
        console.log('\n5. After running the SQL, the image column will be restored.');
        return;
      }
    } else {
      console.log('✅ Image column added successfully!');
    }
    
    // Verify the column was added
    const { data: afterData, error: afterError } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (afterError) {
      console.error('Error verifying column addition:', afterError);
      return;
    }
    
    if (afterData && afterData.length > 0) {
      console.log('\nColumns after adding image column:');
      console.log(Object.keys(afterData[0]));
      
      if ('image' in afterData[0]) {
        console.log('✅ Image column successfully restored!');
        
        // Optional: Migrate data from product_images table back to products.image
        console.log('\nChecking if we should migrate primary images back...');
        
        const { data: imageData, error: imageError } = await supabase
          .from('product_images')
          .select('product_id, image_url')
          .eq('is_primary', true);
        
        if (!imageError && imageData && imageData.length > 0) {
          console.log(`Found ${imageData.length} primary images to migrate back.`);
          
          for (const img of imageData) {
            const { error: updateError } = await supabase
              .from('products')
              .update({ image: img.image_url })
              .eq('id', img.product_id);
            
            if (updateError) {
              console.error(`Error updating product ${img.product_id}:`, updateError);
            } else {
              console.log(`✅ Migrated image for product ${img.product_id}`);
            }
          }
          
          console.log('\n✅ Primary images migrated back to products.image column!');
        } else {
          console.log('No primary images found to migrate.');
        }
      } else {
        console.log('❌ Image column was not added successfully.');
      }
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

restoreImageColumn();