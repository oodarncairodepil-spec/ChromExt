const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProductVariants() {
  try {
    console.log('Checking TOKYO PLEATS SKIRT product...');
    
    // Find the product
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, has_variants')
      .ilike('name', '%TOKYO PLEATS SKIRT%');
    
    if (productError) {
      console.error('Error fetching product:', productError);
      return;
    }
    
    console.log('Products found:', products);
    
    if (products && products.length > 0) {
      const product = products[0];
      console.log(`\nProduct: ${product.name}`);
      console.log(`ID: ${product.id}`);
      console.log(`Has variants: ${product.has_variants}`);
      
      // Check for variants
      const { data: variants, error: variantError } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', product.id);
      
      if (variantError) {
        console.error('Error fetching variants:', variantError);
        return;
      }
      
      console.log(`\nVariants found: ${variants ? variants.length : 0}`);
      if (variants && variants.length > 0) {
        console.log('Variant details:');
        variants.forEach((variant, index) => {
          console.log(`  ${index + 1}. ${variant.full_product_name}`);
          console.log(`     Price: ${variant.price}`);
          console.log(`     Stock: ${variant.stock}`);
          console.log(`     Active: ${variant.active}`);
        });
      }
    } else {
      console.log('No products found with that name.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProductVariants();