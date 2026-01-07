const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVariantsSchema() {
  try {
    console.log('Checking product_variants table schema...');
    
    // Get one variant to see all available columns
    const { data: variants, error } = await supabase
      .from('product_variants')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching variant:', error);
      return;
    }
    
    if (variants && variants.length > 0) {
      console.log('Available columns in product_variants:');
      console.log(Object.keys(variants[0]));
      console.log('\nSample variant data:');
      console.log(variants[0]);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkVariantsSchema();