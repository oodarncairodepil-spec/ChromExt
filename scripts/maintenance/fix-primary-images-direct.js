require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
);

async function fixPrimaryImagesDirect() {
  try {
    console.log('🔧 Starting direct primary image fix...');
    
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
    
    // Process each product
    for (const [productId, images] of Object.entries(imagesByProduct)) {
      const primaryImages = images.filter(img => img.is_primary);
      
      if (primaryImages.length === 0) {
        // No primary image - set the first (oldest) one as primary
        const firstImage = images[0];
        console.log(`🔧 Product ${productId}: Setting first image as primary`);
        
        const { error } = await supabase
          .from('product_images')
          .update({ is_primary: true })
          .eq('id', firstImage.id);
        
        if (error) {
          console.error(`❌ Error setting primary for ${productId}:`, error);
        } else {
          console.log(`✅ Set primary image for ${productId}`);
        }
      } else if (primaryImages.length > 1) {
        // Multiple primary images - use a transaction-like approach
        console.log(`🔧 Product ${productId}: Fixing ${primaryImages.length} primary images`);
        
        // First, set ALL images for this product to non-primary
        const { error: resetError } = await supabase
          .from('product_images')
          .update({ is_primary: false })
          .eq('product_id', productId);
        
        if (resetError) {
          console.error(`❌ Error resetting images for ${productId}:`, resetError);
          continue;
        }
        
        // Then set the first (oldest) one as primary
        const keepPrimary = images[0]; // First by created_at due to ordering
        const { error: setPrimaryError } = await supabase
          .from('product_images')
          .update({ is_primary: true })
          .eq('id', keepPrimary.id);
        
        if (setPrimaryError) {
          console.error(`❌ Error setting primary for ${productId}:`, setPrimaryError);
        } else {
          console.log(`✅ Fixed primary image for ${productId}`);
        }
      } else {
        console.log(`✅ Product ${productId}: Already has exactly one primary image`);
      }
    }
    
    console.log('\n🎉 Direct primary image fix completed!');
    
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
    
    if (issuesFound === 0 && productsWithoutImages === 0) {
      console.log('✅ All products now have exactly one primary image!');
    } else {
      console.log(`❌ Found ${issuesFound + productsWithoutImages} products with primary image issues`);
    }
    
  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

fixPrimaryImagesDirect();