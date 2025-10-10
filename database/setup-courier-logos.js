#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

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

// Function to decode logo data to buffer
function decodeLogoData(logoData) {
  if (!logoData || typeof logoData !== 'string') {
    return null;
  }
  
  try {
    // First, decode the hex-encoded string to get the JSON
    const jsonString = Buffer.from(logoData, 'hex').toString('utf8');
    console.log(`   🔍 Decoded JSON length: ${jsonString.length}`);
    
    // Parse the JSON to get the Buffer data
    const bufferData = JSON.parse(jsonString);
    
    if (bufferData.type === 'Buffer' && Array.isArray(bufferData.data)) {
      console.log(`   📊 Buffer data array length: ${bufferData.data.length}`);
      const buffer = Buffer.from(bufferData.data);
      return buffer;
    } else {
      console.log(`   ❌ Unexpected JSON structure:`, Object.keys(bufferData));
      return null;
    }
    
  } catch (error) {
    console.log(`   ❌ Failed to decode logo data:`, error.message);
    return null;
  }
}

// Function to detect image format from buffer
function detectImageFormat(buffer) {
  if (!buffer || buffer.length < 4) return null;
  
  // Check PNG signature
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'png';
  }
  
  // Check JPEG signature
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return 'jpg';
  }
  
  // Check GIF signature
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'gif';
  }
  
  // Check SVG (text-based)
  const text = buffer.toString('utf8', 0, Math.min(100, buffer.length));
  if (text.includes('<svg') || text.includes('<?xml')) {
    return 'svg';
  }
  
  return null;
}

// Function to upload logo to storage
async function uploadLogoToStorage(courierCode, logoBuffer, format) {
  const fileName = `${courierCode}-logo.${format}`;
  
  try {
    console.log(`   📤 Uploading ${fileName}...`);
    
    const { data, error } = await supabase.storage
      .from('courier-logos')
      .upload(fileName, logoBuffer, {
        contentType: `image/${format}`,
        upsert: true // Overwrite if exists
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('courier-logos')
      .getPublicUrl(fileName);
    
    console.log(`   ✅ Uploaded successfully: ${urlData.publicUrl}`);
    return urlData.publicUrl;
    
  } catch (error) {
    console.error(`   ❌ Upload failed for ${fileName}:`, error.message);
    return null;
  }
}

// Function to process and upload courier logos
async function processAndUploadLogos() {
  console.log('🚀 Processing and uploading courier logos to storage...');
  
  try {
    // Get couriers with logo data
    const { data: couriers, error: courierError } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .not('logo_data', 'is', null)
      .order('name');
    
    if (courierError) {
      throw courierError;
    }
    
    console.log(`\n📊 Found ${couriers.length} couriers with logo data`);
    
    let uploadCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const courier of couriers) {
      console.log(`\n🔄 Processing ${courier.code} (${courier.name})...`);
      
      // Skip if already has URL
      if (courier.logo_data.startsWith('http')) {
        console.log(`   ⏭️  Already has URL, skipping`);
        skipCount++;
        continue;
      }
      
      // Try to decode hex data
      const logoBuffer = hexToBuffer(courier.logo_data);
      if (!logoBuffer) {
        console.log(`   ❌ Failed to decode hex data`);
        errorCount++;
        continue;
      }
      
      // Detect image format
      const format = detectImageFormat(logoBuffer);
      if (!format) {
        console.log(`   ❌ Could not detect image format`);
        errorCount++;
        continue;
      }
      
      console.log(`   🔍 Detected format: ${format} (${logoBuffer.length} bytes)`);
      
      // Upload to storage
      const publicUrl = await uploadLogoToStorage(courier.code, logoBuffer, format);
      
      if (publicUrl) {
        // Update database with new URL
        const { error: updateError } = await supabase
          .from('shipping_couriers')
          .update({ logo_data: publicUrl })
          .eq('code', courier.code);
        
        if (updateError) {
          console.error(`   ❌ Failed to update database:`, updateError.message);
          errorCount++;
        } else {
          console.log(`   ✅ Database updated with new URL`);
          uploadCount++;
        }
      } else {
        errorCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n🎉 Processing completed!');
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successfully uploaded: ${uploadCount}`);
    console.log(`   ⏭️  Skipped (already URLs): ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('❌ Processing failed:', error.message);
    process.exit(1);
  }
}

// Function to clean up storage bucket
async function cleanupStorage() {
  console.log('🧹 Cleaning up courier-logos storage bucket...');
  
  try {
    const { data: files, error } = await supabase.storage
      .from('courier-logos')
      .list('', { limit: 100 });
    
    if (error) {
      throw error;
    }
    
    console.log(`\n📁 Found ${files.length} files in bucket`);
    
    // Remove the generic 'courier-logos' file if it exists
    const genericFile = files.find(f => f.name === 'courier-logos');
    if (genericFile) {
      console.log('🗑️  Removing generic courier-logos file...');
      
      const { error: deleteError } = await supabase.storage
        .from('courier-logos')
        .remove(['courier-logos']);
      
      if (deleteError) {
        console.error('❌ Failed to remove generic file:', deleteError.message);
      } else {
        console.log('✅ Generic file removed successfully');
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--cleanup')) {
    await cleanupStorage();
  } else {
    await processAndUploadLogos();
  }
}

if (require.main === module) {
  main();
}

module.exports = { processAndUploadLogos, cleanupStorage };