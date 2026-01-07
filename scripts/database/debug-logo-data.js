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

async function debugLogoData() {
  console.log('🔍 Debugging logo data format...');
  
  try {
    // Get one courier with logo data
    const { data: courier, error } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .eq('code', 'anteraja')
      .single();
    
    if (error) {
      throw error;
    }
    
    console.log(`\n📊 Courier: ${courier.code} (${courier.name})`);
    console.log(`📏 Logo data length: ${courier.logo_data.length}`);
    console.log(`🔤 Data type: ${typeof courier.logo_data}`);
    
    // Show first 200 characters
    console.log(`\n📝 First 200 characters:`);
    console.log(courier.logo_data.substring(0, 200));
    
    // Show last 100 characters
    console.log(`\n📝 Last 100 characters:`);
    console.log(courier.logo_data.substring(courier.logo_data.length - 100));
    
    // Check if it's a URL
    if (courier.logo_data.startsWith('http')) {
      console.log('\n✅ This appears to be a URL');
      return;
    }
    
    // Check if it's base64
    if (courier.logo_data.match(/^[A-Za-z0-9+/]+=*$/)) {
      console.log('\n🔍 This appears to be base64 encoded');
      
      try {
        const buffer = Buffer.from(courier.logo_data, 'base64');
        console.log(`📏 Decoded buffer length: ${buffer.length}`);
        
        // Check image signatures
        if (buffer.length >= 4) {
          const signature = buffer.subarray(0, 4);
          console.log(`🔍 First 4 bytes (hex): ${signature.toString('hex')}`);
          
          if (signature[0] === 0x89 && signature[1] === 0x50) {
            console.log('✅ PNG signature detected');
          } else if (signature[0] === 0xFF && signature[1] === 0xD8) {
            console.log('✅ JPEG signature detected');
          } else if (signature[0] === 0x47 && signature[1] === 0x49) {
            console.log('✅ GIF signature detected');
          } else {
            console.log('❓ Unknown image format');
          }
        }
      } catch (e) {
        console.log('❌ Failed to decode as base64:', e.message);
      }
    }
    
    // Check if it's hex
    if (courier.logo_data.match(/^[0-9a-fA-F]+$/)) {
      console.log('\n🔍 This appears to be hex encoded');
      
      try {
        const buffer = Buffer.from(courier.logo_data, 'hex');
        console.log(`📏 Decoded buffer length: ${buffer.length}`);
        
        // Check image signatures
        if (buffer.length >= 4) {
          const signature = buffer.subarray(0, 4);
          console.log(`🔍 First 4 bytes (hex): ${signature.toString('hex')}`);
          
          if (signature[0] === 0x89 && signature[1] === 0x50) {
            console.log('✅ PNG signature detected');
          } else if (signature[0] === 0xFF && signature[1] === 0xD8) {
            console.log('✅ JPEG signature detected');
          } else if (signature[0] === 0x47 && signature[1] === 0x49) {
            console.log('✅ GIF signature detected');
          } else {
            console.log('❓ Unknown image format');
            console.log(`🔍 First 20 bytes as text: ${buffer.subarray(0, 20).toString()}`);
          }
        }
      } catch (e) {
        console.log('❌ Failed to decode as hex:', e.message);
      }
    }
    
    // Check if it might be JSON
    if (courier.logo_data.startsWith('{') || courier.logo_data.startsWith('[')) {
      console.log('\n🔍 This appears to be JSON');
      
      try {
        const parsed = JSON.parse(courier.logo_data);
        console.log('✅ Valid JSON structure:');
        console.log(JSON.stringify(parsed, null, 2).substring(0, 500));
      } catch (e) {
        console.log('❌ Invalid JSON:', e.message);
      }
    }
    
    // Check if it might be a data URL
    if (courier.logo_data.startsWith('data:')) {
      console.log('\n✅ This appears to be a data URL');
      const parts = courier.logo_data.split(',');
      if (parts.length === 2) {
        console.log(`📝 Header: ${parts[0]}`);
        console.log(`📏 Data length: ${parts[1].length}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

if (require.main === module) {
  debugLogoData();
}

module.exports = { debugLogoData };