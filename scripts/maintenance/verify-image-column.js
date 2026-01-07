require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin access
const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function verifyImageColumn() {
  try {
    console.log('Verifying image column restoration...');
    
    // Check if image column exists
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying products table:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Current products table columns:');
      console.log(Object.keys(data[0]));
      
      if ('image' in data[0]) {
        console.log('\n✅ Image column exists!');
        
        // Check how many products have images
        const { data: productsWithImages, error: countError } = await supabase
          .from('products')
          .select('id, name, image')
          .not('image', 'is', null)
          .neq('image', '');
        
        if (!countError) {
          console.log(`\n📊 Products with images: ${productsWithImages?.length || 0}`);
          
          if (productsWithImages && productsWithImages.length > 0) {
            console.log('\nSample products with images:');
            productsWithImages.slice(0, 5).forEach(product => {
              console.log(`- ${product.name}: ${product.image}`);
            });
          }
        }
        
        // Compare with product_images table
        const { data: primaryImages, error: primaryError } = await supabase
          .from('product_images')
          .select('product_id, image_url')
          .eq('is_primary', true);
        
        if (!primaryError) {
          console.log(`\n📊 Primary images in product_images table: ${primaryImages?.length || 0}`);
          
          if (primaryImages && primaryImages.length > 0) {
            console.log('\n🔄 Migration status check:');
            
            for (const primaryImg of primaryImages.slice(0, 5)) {
              const { data: productData } = await supabase
                .from('products')
                .select('id, name, image')
                .eq('id', primaryImg.product_id)
                .single();
              
              if (productData) {
                const migrated = productData.image === primaryImg.image_url;
                console.log(`- ${productData.name}: ${migrated ? '✅ Migrated' : '❌ Not migrated'}`);
              }
            }
          }
        }
        
      } else {
        console.log('\n❌ Image column does NOT exist');
        console.log('\n📋 Please run the SQL commands in restore-image-column.sql:');
        console.log('1. Go to your Supabase project dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and run the SQL from restore-image-column.sql');
      }
    } else {
      console.log('No products found in the table.');
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

verifyImageColumn();