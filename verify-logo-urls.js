#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to test URL accessibility
function testUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.get(url, (res) => {
      resolve({
        url,
        status: res.statusCode,
        accessible: res.statusCode === 200
      });
    });
    
    req.on('error', (err) => {
      resolve({
        url,
        status: 'ERROR',
        accessible: false,
        error: err.message
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        accessible: false,
        error: 'Request timeout'
      });
    });
  });
}

async function verifyLogoUrls() {
  try {
    console.log('🔍 Verifying courier logo URLs...');
    
    // Get all couriers with their logo_data
    const { data: couriers, error: fetchError } = await supabase
      .from('shipping_couriers')
      .select('id, name, logo_data')
      .order('name');
    
    if (fetchError) {
      console.error('❌ Error fetching couriers:', fetchError);
      return;
    }
    
    console.log(`📋 Testing ${couriers.length} courier logo URLs...\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const courier of couriers) {
      if (!courier.logo_data) {
        console.log(`⚠️  ${courier.name}: No logo_data`);
        failCount++;
        continue;
      }
      
      const result = await testUrl(courier.logo_data);
      
      if (result.accessible) {
        console.log(`✅ ${courier.name}: ${result.status} - ${result.url}`);
        successCount++;
      } else {
        console.log(`❌ ${courier.name}: ${result.status} - ${result.url}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        failCount++;
      }
    }
    
    console.log(`\n📊 Results:`);
    console.log(`✅ Accessible: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📈 Success rate: ${((successCount / couriers.length) * 100).toFixed(1)}%`);
    
    if (failCount > 0) {
      console.log('\n💡 Failed URLs may need to be re-uploaded or have permission issues.');
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
}

verifyLogoUrls();