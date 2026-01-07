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

// Function to decode hex string to plain text
function hexToString(hexString) {
  if (!hexString || typeof hexString !== 'string') {
    return null;
  }
  
  try {
    // Remove \x prefix if present and convert to buffer
    const cleanHex = hexString.replace(/\\x/g, '');
    const buffer = Buffer.from(cleanHex, 'hex');
    return buffer.toString('utf8');
  } catch (error) {
    console.error('Failed to decode hex:', error.message);
    return null;
  }
}

async function decodeAndFixUrls() {
  console.log('🔧 Decoding hex-encoded URLs and fixing logo_data...');
  
  try {
    // Get all couriers with logo_data
    const { data: couriers, error } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .not('logo_data', 'is', null)
      .order('code');
    
    if (error) throw error;
    
    console.log(`\n📊 Found ${couriers.length} couriers with logo_data`);
    
    let fixedCount = 0;
    let alreadyCorrect = 0;
    let errorCount = 0;
    
    for (const courier of couriers) {
      console.log(`\n🔄 Processing ${courier.code} (${courier.name})...`);
      
      // Check if already a plain URL
      if (courier.logo_data.startsWith('http')) {
        console.log(`   ✅ Already a plain URL`);
        alreadyCorrect++;
        continue;
      }
      
      // Try to decode hex-encoded URL
      const decodedUrl = hexToString(courier.logo_data);
      
      if (!decodedUrl) {
        console.log(`   ❌ Failed to decode hex data`);
        errorCount++;
        continue;
      }
      
      console.log(`   🔍 Decoded URL: ${decodedUrl}`);
      
      // Verify it's a valid URL
      if (!decodedUrl.startsWith('http')) {
        console.log(`   ❌ Decoded data is not a valid URL`);
        errorCount++;
        continue;
      }
      
      // Update database with plain URL
      console.log(`   💾 Updating database with plain URL...`);
      
      const { error: updateError } = await supabase
        .from('shipping_couriers')
        .update({ logo_data: decodedUrl })
        .eq('code', courier.code);
      
      if (updateError) {
        console.error(`   ❌ Failed to update:`, updateError.message);
        errorCount++;
      } else {
        console.log(`   ✅ Successfully updated to plain URL`);
        fixedCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 URL decoding and fixing completed!');
    console.log(`\n📊 Results:`);
    console.log(`   🔧 Fixed (hex to plain): ${fixedCount}`);
    console.log(`   ✅ Already correct: ${alreadyCorrect}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Verify final state
    console.log('\n🔍 Verifying final state...');
    
    const { data: finalState, error: finalError } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .not('logo_data', 'is', null)
      .order('code');
    
    if (finalError) throw finalError;
    
    let urlCount = 0;
    let nonUrlCount = 0;
    
    console.log('\nFinal verification:');
    finalState.forEach(courier => {
      if (courier.logo_data.startsWith('http')) {
        console.log(`   ✅ ${courier.code.padEnd(15)} Plain URL (${courier.logo_data.length} chars)`);
        urlCount++;
      } else {
        console.log(`   ❌ ${courier.code.padEnd(15)} Not URL (${courier.logo_data.length} chars)`);
        nonUrlCount++;
      }
    });
    
    console.log(`\n📈 Final Summary:`);
    console.log(`   ✅ Plain URLs: ${urlCount}`);
    console.log(`   ❌ Non-URLs: ${nonUrlCount}`);
    
    if (urlCount > 0) {
      console.log('\n🎉 Logo data now uses simple image paths!');
    }
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
    process.exit(1);
  }
}

// Function to test hex decoding
async function testDecoding() {
  console.log('🧪 Testing hex decoding...');
  
  try {
    const { data: courier, error } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .eq('code', 'anteraja')
      .single();
    
    if (error) throw error;
    
    console.log(`\n📊 Testing with ${courier.code}:`);
    console.log(`   📝 Original: ${courier.logo_data}`);
    console.log(`   📏 Length: ${courier.logo_data.length}`);
    
    const decoded = hexToString(courier.logo_data);
    console.log(`   🔍 Decoded: ${decoded}`);
    
    if (decoded && decoded.startsWith('http')) {
      console.log(`   ✅ Successfully decoded to valid URL`);
    } else {
      console.log(`   ❌ Decoding failed or not a valid URL`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    await testDecoding();
  } else {
    await decodeAndFixUrls();
  }
}

if (require.main === module) {
  main();
}

module.exports = { decodeAndFixUrls, testDecoding, hexToString };