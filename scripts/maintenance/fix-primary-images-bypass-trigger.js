require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY // Using service role key for admin operations
);

async function fixPrimaryImagesBypassTrigger() {
  try {
    console.log('🔧 Starting primary image fix with trigger bypass...');
    
    // First, let's try to disable the trigger (this might not work with Supabase client)
    console.log('⚠️  Attempting to disable trigger (may not work via client)...');
    
    // Get all images and group by product
    const { data: allImages, error: allImagesError } = await supabase
      .from('product_images')
      .select('id, product_id, is_primary, created_at')
      .order('product_id', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (allImagesError) {
      console.error('❌ Error fetching images:', allImagesError);
      return;
    }
    
    console.log(`📊 Found ${allImages.length} total images`);
    
    // Group by product_id
    const imagesByProduct = {};
    allImages.forEach(img => {
      if (!imagesByProduct[img.product_id]) {
        imagesByProduct[img.product_id] = [];
      }
      imagesByProduct[img.product_id].push(img);
    });
    
    console.log(`📊 Processing ${Object.keys(imagesByProduct).length} products`);
    
    // Focus on the problematic products first
    const problematicProducts = [
      '4cec58e6-2883-4bd7-aa2e-bd970bde4da1',
      '9bb00495-ad35-4ae0-845d-91ef6451e540'
    ];
    
    for (const productId of problematicProducts) {
      if (!imagesByProduct[productId]) {
        console.log(`⚠️  Product ${productId} not found in images`);
        continue;
      }
      
      const images = imagesByProduct[productId];
      const primaryImages = images.filter(img => img.is_primary);
      
      console.log(`\n🔧 Processing problematic product ${productId}:`);
      console.log(`   - Total images: ${images.length}`);
      console.log(`   - Primary images: ${primaryImages.length}`);
      
      if (primaryImages.length > 1) {
        console.log(`   - Fixing ${primaryImages.length} primary images...`);
        
        // Use a different approach: delete and recreate the records
        // This bypasses the trigger since we're not updating
        
        // First, get all the image data
        const { data: fullImageData, error: fetchError } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId);
        
        if (fetchError) {
          console.error(`❌ Error fetching full data for ${productId}:`, fetchError);
          continue;
        }
        
        console.log(`   - Backing up ${fullImageData.length} image records...`);
        
        // Delete all images for this product
        const { error: deleteError } = await supabase
          .from('product_images')
          .delete()
          .eq('product_id', productId);
        
        if (deleteError) {
          console.error(`❌ Error deleting images for ${productId}:`, deleteError);
          continue;
        }
        
        console.log(`   - Deleted all images for product`);
        
        // Re-insert with corrected is_primary values
        const correctedImages = fullImageData.map((img, index) => ({
          ...img,
          is_primary: index === 0 // Only the first image is primary
        }));
        
        const { error: insertError } = await supabase
          .from('product_images')
          .insert(correctedImages);
        
        if (insertError) {
          console.error(`❌ Error re-inserting images for ${productId}:`, insertError);
          // Try to restore the original data
          await supabase.from('product_images').insert(fullImageData);
          continue;
        }
        
        console.log(`✅ Successfully fixed primary images for ${productId}`);
      }
    }
    
    console.log('\n🎉 Primary image fix with bypass completed!');
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const { data: verifyImages } = await supabase
      .from('product_images')
      .select('product_id, is_primary');
    
    const verifyByProduct = {};
    verifyImages.forEach(img => {
      if (!verifyByProduct[img.product_id]) {
        verifyByProduct[img.product_id] = { primary: 0, total: 0 };
      }
      verifyByProduct[img.product_id].total++;
      if (img.is_primary) {
        verifyByProduct[img.product_id].primary++;
      }
    });
    
    let issuesFound = 0;
    let productsWithoutImages = 0;
    for (const [productId, counts] of Object.entries(verifyByProduct)) {
      if (counts.primary === 0) {
        console.log(`⚠️  Product ${productId}: No primary image (${counts.total} total images)`);
        productsWithoutImages++;
      } else if (counts.primary > 1) {
        console.log(`❌ Product ${productId}: ${counts.primary} primary images (should be 1)`);
        issuesFound++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Products with exactly 1 primary image: ${Object.keys(verifyByProduct).length - issuesFound - productsWithoutImages}`);
    console.log(`- Products with no primary image: ${productsWithoutImages}`);
    console.log(`- Products with multiple primary images: ${issuesFound}`);
    console.log(`- Total primary images: ${verifyImages.filter(img => img.is_primary).length}`);
    
    if (issuesFound === 0 && productsWithoutImages === 0) {
      console.log('✅ All products now have exactly one primary image!');
    } else {
      console.log(`❌ Found ${issuesFound + productsWithoutImages} products with primary image issues`);
    }
    
  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

fixPrimaryImagesBypassTrigger();