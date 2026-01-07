require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
);

async function fixPrimaryImages() {
  try {
    console.log('🔧 Starting primary image fix...');
    
    // Get all product images grouped by product_id
    const { data: allImages, error: fetchError } = await supabase
      .from('product_images')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      console.error('❌ Error fetching images:', fetchError);
      return;
    }
    
    console.log(`📊 Found ${allImages.length} total images`);
    
    // Group images by product_id
    const imagesByProduct = {};
    allImages.forEach(img => {
      if (!imagesByProduct[img.product_id]) {
        imagesByProduct[img.product_id] = [];
      }
      imagesByProduct[img.product_id].push(img);
    });
    
    console.log(`📊 Found images for ${Object.keys(imagesByProduct).length} products`);
    
    // Fix each product's primary image
    for (const [productId, images] of Object.entries(imagesByProduct)) {
      const primaryImages = images.filter(img => img.is_primary);
      
      console.log(`\n🔍 Product ${productId}:`);
      console.log(`  - Total images: ${images.length}`);
      console.log(`  - Primary images: ${primaryImages.length}`);
      
      if (primaryImages.length === 0) {
        // No primary image - set the first one as primary
        const firstImage = images[0];
        console.log(`  ✅ Setting first image as primary: ${firstImage.id}`);
        
        const { error: updateError } = await supabase
          .from('product_images')
          .update({ is_primary: true })
          .eq('id', firstImage.id);
        
        if (updateError) {
          console.error(`  ❌ Error updating image ${firstImage.id}:`, updateError);
        } else {
          console.log(`  ✅ Successfully set image ${firstImage.id} as primary`);
        }
      } else if (primaryImages.length > 1) {
        // Multiple primary images - keep the first one, set others to false
        console.log(`  🔧 Multiple primary images found, fixing...`);
        
        const keepPrimary = primaryImages[0];
        const makeFalse = primaryImages.slice(1);
        
        console.log(`  ✅ Keeping ${keepPrimary.id} as primary`);
        console.log(`  🔧 Setting ${makeFalse.length} images to non-primary`);
        
        for (const img of makeFalse) {
          const { error: updateError } = await supabase
            .from('product_images')
            .update({ is_primary: false })
            .eq('id', img.id);
          
          if (updateError) {
            console.error(`  ❌ Error updating image ${img.id}:`, updateError);
          } else {
            console.log(`  ✅ Set image ${img.id} to non-primary`);
          }
        }
      } else {
        console.log(`  ✅ Already has exactly one primary image`);
      }
    }
    
    console.log('\n🎉 Primary image fix completed!');
    
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
    for (const [productId, counts] of Object.entries(verifyByProduct)) {
      if (counts.primary !== 1) {
        console.log(`❌ Product ${productId}: ${counts.primary} primary images (should be 1)`);
        issuesFound++;
      }
    }
    
    if (issuesFound === 0) {
      console.log('✅ All products now have exactly one primary image!');
    } else {
      console.log(`❌ Found ${issuesFound} products with primary image issues`);
    }
    
  } catch (error) {
    console.error('💥 Script error:', error);
  }
}

fixPrimaryImages();