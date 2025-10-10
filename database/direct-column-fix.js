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

async function directColumnFix() {
  console.log('🔧 Direct approach: Converting hex data to plain URLs...');
  
  try {
    // Step 1: Get all couriers with logo_data
    console.log('\n📊 Fetching all couriers with logo data...');
    
    const { data: couriers, error } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .not('logo_data', 'is', null)
      .order('code');
    
    if (error) throw error;
    
    console.log(`Found ${couriers.length} couriers with logo data`);
    
    // Step 2: Process each courier
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const courier of couriers) {
      console.log(`\n🔄 Processing ${courier.code} (${courier.name})...`);
      
      // Check if already a plain URL
      if (courier.logo_data.startsWith('http')) {
        console.log(`   ✅ Already a plain URL, skipping`);
        skipCount++;
        continue;
      }
      
      // Try to decode hex-encoded URL
      const decodedUrl = hexToString(courier.logo_data);
      
      if (!decodedUrl) {
        console.log(`   ❌ Failed to decode hex data`);
        errorCount++;
        continue;
      }
      
      console.log(`   🔍 Decoded: ${decodedUrl}`);
      
      // Verify it's a valid URL
      if (!decodedUrl.startsWith('http')) {
        console.log(`   ❌ Decoded data is not a valid URL`);
        errorCount++;
        continue;
      }
      
      // Update database with plain URL
      console.log(`   💾 Updating with plain URL...`);
      
      const { error: updateError } = await supabase
        .from('shipping_couriers')
        .update({ logo_data: decodedUrl })
        .eq('code', courier.code);
      
      if (updateError) {
        console.error(`   ❌ Update failed:`, updateError.message);
        errorCount++;
      } else {
        console.log(`   ✅ Successfully updated`);
        successCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 Direct conversion completed!');
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successfully converted: ${successCount}`);
    console.log(`   ⏭️ Already correct: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    // Step 3: Verify final state
    console.log('\n🔍 Verifying final state...');
    
    const { data: finalState, error: finalError } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .not('logo_data', 'is', null)
      .order('code');
    
    if (finalError) throw finalError;
    
    let urlCount = 0;
    let hexCount = 0;
    let otherCount = 0;
    
    console.log('\n📋 Final verification:');
    finalState.forEach(courier => {
      if (courier.logo_data.startsWith('http')) {
        console.log(`   ✅ ${courier.code.padEnd(15)} Plain URL`);
        urlCount++;
      } else if (courier.logo_data.startsWith('\\x')) {
        console.log(`   ❌ ${courier.code.padEnd(15)} Still hex-encoded`);
        hexCount++;
      } else {
        console.log(`   ⚠️ ${courier.code.padEnd(15)} Other format`);
        otherCount++;
      }
    });
    
    console.log(`\n📈 Final Summary:`);
    console.log(`   ✅ Plain URLs: ${urlCount}`);
    console.log(`   ❌ Hex-encoded: ${hexCount}`);
    console.log(`   ⚠️ Other format: ${otherCount}`);
    
    if (urlCount === finalState.length) {
      console.log('\n🎉 SUCCESS: All logo data now uses simple image paths!');
      console.log('\n📋 What was accomplished:');
      console.log('   • Converted hex-encoded URLs to plain text URLs');
      console.log('   • Logo data now stores simple image paths');
      console.log('   • Ready for use in the application');
    } else if (urlCount > 0) {
      console.log('\n⚠️ PARTIAL SUCCESS: Some logo data converted to simple paths');
      console.log(`   • ${urlCount} couriers now have plain URLs`);
      console.log(`   • ${hexCount + otherCount} couriers still need conversion`);
    } else {
      console.log('\n❌ FAILED: No logo data was converted to simple paths');
    }
    
  } catch (error) {
    console.error('❌ Direct conversion failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  directColumnFix();
}

module.exports = { directColumnFix };