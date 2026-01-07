#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkLogoUrls() {
  console.log('🔍 Checking actual logo_data content...');
  
  try {
    // Get a few couriers to check their actual data
    const { data: couriers, error } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .in('code', ['anteraja', 'jne', 'tiki'])
      .order('code');
    
    if (error) throw error;
    
    console.log('\n📊 Actual logo_data content:');
    
    couriers.forEach(courier => {
      console.log(`\n🏢 ${courier.code} (${courier.name}):`);
      console.log(`   📏 Length: ${courier.logo_data ? courier.logo_data.length : 0}`);
      console.log(`   🔤 Type: ${typeof courier.logo_data}`);
      
      if (courier.logo_data) {
        console.log(`   📝 Content: "${courier.logo_data}"`);
        
        // Check if it starts with http
        if (courier.logo_data.startsWith('http')) {
          console.log(`   ✅ This is a valid URL`);
        } else {
          console.log(`   ❌ This is NOT a URL`);
          console.log(`   🔍 First 50 chars: "${courier.logo_data.substring(0, 50)}"`);
        }
      } else {
        console.log(`   ❌ No logo_data`);
      }
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

if (require.main === module) {
  checkLogoUrls();
}

module.exports = { checkLogoUrls };