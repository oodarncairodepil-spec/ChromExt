const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY
);

async function fixOrderImages() {
  try {
    console.log('Fixing order images...');
    
    // Get all orders that have items without product_image
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, items')
      .not('items', 'is', null);
    
    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return;
    }
    
    console.log(`Found ${orders?.length || 0} orders to check`);
    
    for (const order of orders || []) {
      let needsUpdate = false;
      const updatedItems = [];
      
      for (const item of order.items || []) {
        const updatedItem = { ...item };
        
        // If item doesn't have product_image but has product_id, fetch the image
        if (!item.product_image && item.product_id) {
          console.log(`Fetching image for product ${item.product_id} in order ${order.order_number}`);
          
          // First try to get image from product_images table
          const { data: productImagesData, error: productImagesError } = await supabase
            .from('product_images')
            .select('image_url')
            .eq('product_id', item.product_id)
            .eq('is_primary', true)
            .single();
          
          if (!productImagesError && productImagesData?.image_url) {
            updatedItem.product_image = productImagesData.image_url;
            needsUpdate = true;
            console.log(`  ✅ Found primary image in product_images table`);
          } else {
            // Fallback to any image from product_images table
            const { data: anyImageData, error: anyImageError } = await supabase
              .from('product_images')
              .select('image_url')
              .eq('product_id', item.product_id)
              .limit(1)
              .single();
            
            if (!anyImageError && anyImageData?.image_url) {
              updatedItem.product_image = anyImageData.image_url;
              needsUpdate = true;
              console.log(`  ✅ Found any image in product_images table`);
            } else {
              // Fallback to products table
              const { data: productData, error: productError } = await supabase
                .from('products')
                .select('image')
                .eq('id', item.product_id)
                .single();
              
              if (!productError && productData?.image) {
                updatedItem.product_image = productData.image;
                needsUpdate = true;
                console.log(`  ✅ Found image in products table`);
              } else {
                console.log(`  ❌ No image found for product ${item.product_id}`);
              }
            }
          }
        }
        
        updatedItems.push(updatedItem);
      }
      
      // Update the order if needed
      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('orders')
          .update({ items: updatedItems })
          .eq('id', order.id);
        
        if (updateError) {
          console.error(`Error updating order ${order.order_number}:`, updateError);
        } else {
          console.log(`✅ Updated order ${order.order_number}`);
        }
      } else {
        console.log(`⏭️  Order ${order.order_number} already has images or no product_ids`);
      }
    }
    
    console.log('\n🎉 Order image fixing completed!');
    console.log('📱 Now check your Chrome extension Orders page - images should display properly.');
    
  } catch (error) {
    console.error('Error fixing order images:', error);
  }
}

fixOrderImages();