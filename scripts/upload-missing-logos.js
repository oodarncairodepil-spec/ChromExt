#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

// Default courier logos mapping
const courierLogos = {
  'anteraja': 'anteraja-logo.png',
  'jne': 'jne-logo.png',
  'jnt': 'jnt-logo.png',
  'tiki': 'tiki-logo.png',
  'pos': 'pos-logo.png',
  'sicepat': 'sicepat-logo.png',
  'wahana': 'wahana-logo.png',
  'lion': 'lion-logo.png',
  'ncs': 'ncs-logo.png',
  'rpx': 'rpx-logo.png',
  'id-express': 'id-express-logo.png',
  'grab': 'grab-logo.png',
  'gosend': 'gosend-logo.png',
  'sap': 'sap-logo.png',
  'sentral-cargo': 'sentral-cargo-logo.png',
  'paxel': 'paxel-logo.png',
  'posindonesia': 'posindonesia-logo.png'
};

// Create a simple placeholder SVG for missing logos
function createPlaceholderSVG(courierName) {
  return `<svg width="100" height="60" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="60" fill="#f3f4f6" stroke="#d1d5db" stroke-width="1"/>
  <text x="50" y="35" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#6b7280">${courierName.toUpperCase()}</text>
</svg>`;
}

async function uploadMissingLogos() {
  try {
    console.log('🚀 Starting upload of missing courier logos...');
    
    // Get current couriers from database
    const { data: couriers, error: fetchError } = await supabase
      .from('shipping_couriers')
      .select('id, name, logo_data')
      .order('name');
    
    if (fetchError) {
      console.error('❌ Error fetching couriers:', fetchError);
      return;
    }
    
    console.log(`📋 Found ${couriers.length} couriers in database`);
    
    let uploadCount = 0;
    
    for (const courier of couriers) {
      const courierKey = courier.id.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const logoFileName = `${courierKey}-logo.png`;
      
      // Check if logo already exists in storage
      const { data: existingFile } = await supabase.storage
        .from('courier-logos')
        .list('', { search: logoFileName });
      
      if (existingFile && existingFile.length > 0) {
        console.log(`✅ ${logoFileName} already exists, skipping...`);
        continue;
      }
      
      // Create placeholder SVG
      const svgContent = createPlaceholderSVG(courier.name);
      const svgBuffer = Buffer.from(svgContent, 'utf8');
      
      // Upload SVG as PNG (we'll use SVG content but with PNG extension for compatibility)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('courier-logos')
        .upload(logoFileName, svgBuffer, {
          contentType: 'image/svg+xml',
          upsert: true
        });
      
      if (uploadError) {
        console.error(`❌ Error uploading ${logoFileName}:`, uploadError);
        continue;
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('courier-logos')
        .getPublicUrl(logoFileName);
      
      // Update courier logo_data with the new URL
      const { error: updateError } = await supabase
        .from('shipping_couriers')
        .update({ logo_data: urlData.publicUrl })
        .eq('id', courier.id);
      
      if (updateError) {
        console.error(`❌ Error updating courier ${courier.id}:`, updateError);
      } else {
        console.log(`✅ Uploaded and updated ${courier.name}: ${logoFileName}`);
        uploadCount++;
      }
    }
    
    console.log(`\n🎉 Upload complete! Created ${uploadCount} placeholder logos.`);
    console.log('💡 You can now replace these placeholders with actual logo images.');
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
}

uploadMissingLogos();