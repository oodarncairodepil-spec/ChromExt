const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTokyoPleatsSkirt() {
  try {
    console.log('Fixing TOKYO PLEATS SKIRT has_variants flag...');
    
    const productId = '65df114b-18d9-47fb-8e8c-986d998ee72d';
    
    // Update the has_variants flag to true
    const { data, error } = await supabase
      .from('products')
      .update({ has_variants: true })
      .eq('id', productId)
      .select();
    
    if (error) {
      console.error('Error updating product:', error);
      return;
    }
    
    console.log('Successfully updated product:');
    console.log(data);
    
    // Also update the active status for variants (they were undefined)
    const { data: variantData, error: variantError } = await supabase
      .from('product_variants')
      .update({ active: true })
      .eq('product_id', productId)
      .select();
    
    if (variantError) {
      console.error('Error updating variants:', variantError);
      return;
    }
    
    console.log(`\nSuccessfully updated ${variantData.length} variants to active status.`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixTokyoPleatsSkirt();