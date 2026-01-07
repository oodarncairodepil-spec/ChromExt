const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.PLASMO_PUBLIC_SUPABASE_URL,
  process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

async function checkLogoStatus() {
  try {
    const { data, error } = await supabase
      .from('shipping_couriers')
      .select('id, code, name, logo_data')
      .order('name');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Couriers logo data status:');
    console.log('========================');
    
    data.forEach(courier => {
      const hasLogo = courier.logo_data && courier.logo_data.length > 0;
      const logoSize = hasLogo ? courier.logo_data.length : 0;
      console.log(`${courier.name.padEnd(20)} (${courier.code.padEnd(8)}): ${hasLogo ? 'HAS LOGO' : 'NO LOGO'} ${hasLogo ? '(' + logoSize + ' bytes)' : ''}`);
    });
    
    const totalWithLogos = data.filter(c => c.logo_data && c.logo_data.length > 0).length;
    console.log('\nSummary:');
    console.log(`Total couriers: ${data.length}`);
    console.log(`With logos: ${totalWithLogos}`);
    console.log(`Without logos: ${data.length - totalWithLogos}`);
    
  } catch (err) {
    console.error('Error checking logo status:', err);
  }
}

checkLogoStatus();