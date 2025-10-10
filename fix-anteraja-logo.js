const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function fixAnterajaLogo() {
  try {
    console.log('Fixing AnterAja logo URL...');
    
    // Get current AnterAja courier data
    const { data: courier, error: fetchError } = await supabase
      .from('shipping_couriers')
      .select('*')
      .eq('code', 'anteraja')
      .single();
    
    if (fetchError) {
      console.error('Error fetching AnterAja courier:', fetchError);
      return;
    }
    
    console.log('Current AnterAja logo URL:', courier.logo_data);
    
    // Fix the URL by removing duplicate 'courier-logos/' segment
    const currentUrl = courier.logo_data.trim();
    const fixedUrl = currentUrl.replace('/courier-logos/courier-logos/', '/courier-logos/');
    
    console.log('Fixed URL:', fixedUrl);
    
    // Test the fixed URL
    console.log('Testing fixed URL accessibility...');
    try {
      const response = await fetch(fixedUrl);
      console.log(`Fixed URL status: ${response.status}`);
      
      if (response.status === 200) {
        // Update the database with the fixed URL
        const { error: updateError } = await supabase
          .from('shipping_couriers')
          .update({ logo_data: fixedUrl })
          .eq('code', 'anteraja');
        
        if (updateError) {
          console.error('Error updating AnterAja logo:', updateError);
        } else {
          console.log('✅ AnterAja logo URL successfully updated!');
          
          // Verify the update
          const { data: updatedCourier } = await supabase
            .from('shipping_couriers')
            .select('logo_data')
            .eq('code', 'anteraja')
            .single();
          
          console.log('Verified updated URL:', updatedCourier.logo_data);
        }
      } else {
        console.log('❌ Fixed URL is still not accessible');
      }
    } catch (testError) {
      console.error('Error testing fixed URL:', testError.message);
    }
    
  } catch (error) {
    console.error('Error in fixAnterajaLogo:', error);
  }
}

fixAnterajaLogo();