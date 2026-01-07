require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkProductImages() {
  try {
    // Check specific product IDs from console logs
    const productIds = [
      '4cec58e6-2883-4bd7-aa2e-bd970bde4da1',
      '795929a7-6ca7-487a-86f6-8b3f02874bbf',
      '5fde2af2-f641-4ca2-9c62-a41e38922781',
      'f795a5a2-5c12-4aa7-a171-a28fa7e348c0',
      'dba06c5a-daf7-4776-b62c-d4875d0e1a1c'
    ];
    
    console.log('Checking specific products from console logs:');
    
    for (const productId of productIds) {
      // Check product_images table for primary images
      const { data: images, error: imagesError } = await supabase
        .from('product_images')
        .select('*')
        .eq('product_id', productId)
        .eq('is_primary', true);
      
      // Check products table for image column
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, image')
        .eq('id', productId)
        .single();
      
      console.log(`\nProduct: ${product?.name || 'Unknown'} (${productId})`);
      console.log(`- Primary images in product_images: ${images?.length || 0}`);
      console.log(`- Image in products table: ${product?.image || 'null'}`);
      
      if (images?.length > 0) {
        console.log(`- Primary image URL: ${images[0].image_url}`);
      }
    }
    
    // Also check total counts
    const { data: allImages } = await supabase
      .from('product_images')
      .select('product_id, is_primary');
    
    const primaryCount = allImages?.filter(img => img.is_primary).length || 0;
    const totalCount = allImages?.length || 0;
    
    console.log(`\nOverall stats:`);
    console.log(`- Total product images: ${totalCount}`);
    console.log(`- Primary images: ${primaryCount}`);
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

checkProductImages();