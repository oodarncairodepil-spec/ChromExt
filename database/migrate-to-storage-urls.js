#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - PLASMO_PUBLIC_SUPABASE_URL');
  console.error('   - PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to list files in courier-logos bucket
async function listCourierLogos() {
  console.log('🔍 Checking courier-logos storage bucket...');
  
  try {
    const { data: files, error } = await supabase.storage
      .from('courier-logos')
      .list('', {
        limit: 100,
        offset: 0
      });
    
    if (error) {
      throw error;
    }
    
    console.log(`\n📁 Found ${files.length} files in courier-logos bucket:`);
    
    const logoFiles = files.filter(file => 
      file.name.includes('logo') || 
      file.name.match(/\.(png|jpg|jpeg|svg|gif)$/i)
    );
    
    logoFiles.forEach(file => {
      const publicUrl = supabase.storage
        .from('courier-logos')
        .getPublicUrl(file.name).data.publicUrl;
      
      console.log(`   📄 ${file.name} -> ${publicUrl}`);
    });
    
    return logoFiles;
    
  } catch (error) {
    console.error('❌ Error listing courier logos:', error.message);
    return [];
  }
}

// Function to update courier logo_data with storage URLs
async function updateCourierLogos() {
  console.log('\n🚀 Starting courier logo migration to storage URLs...');
  
  try {
    // Get current couriers
    const { data: couriers, error: courierError } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .order('name');
    
    if (courierError) {
      throw courierError;
    }
    
    console.log(`\n📊 Found ${couriers.length} couriers in database`);
    
    // Get available logo files
    const logoFiles = await listCourierLogos();
    
    if (logoFiles.length === 0) {
      console.log('\n⚠️  No logo files found in storage bucket.');
      console.log('   Please upload logo files to the courier-logos bucket first.');
      return;
    }
    
    let updateCount = 0;
    let skipCount = 0;
    
    for (const courier of couriers) {
      console.log(`\n🔄 Processing ${courier.code} (${courier.name})...`);
      
      // Skip if already has a URL
      if (courier.logo_data && courier.logo_data.startsWith('http')) {
        console.log(`   ⏭️  Already has URL: ${courier.logo_data.substring(0, 50)}...`);
        skipCount++;
        continue;
      }
      
      // Find matching logo file
      const matchingFile = logoFiles.find(file => 
        file.name.toLowerCase().includes(courier.code.toLowerCase()) ||
        file.name.toLowerCase().includes(courier.name.toLowerCase().replace(/\s+/g, '').substring(0, 5))
      );
      
      if (matchingFile) {
        const publicUrl = supabase.storage
          .from('courier-logos')
          .getPublicUrl(matchingFile.name).data.publicUrl;
        
        console.log(`   📎 Found matching file: ${matchingFile.name}`);
        console.log(`   🔗 URL: ${publicUrl}`);
        
        // Update database
        const { error: updateError } = await supabase
          .from('shipping_couriers')
          .update({ logo_data: publicUrl })
          .eq('code', courier.code);
        
        if (updateError) {
          console.error(`   ❌ Failed to update ${courier.code}:`, updateError.message);
        } else {
          console.log(`   ✅ Updated successfully`);
          updateCount++;
        }
      } else {
        console.log(`   ⚠️  No matching logo file found`);
        console.log(`   💡 Available files: ${logoFiles.map(f => f.name).join(', ')}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Updated: ${updateCount}`);
    console.log(`   ⏭️  Skipped (already URLs): ${skipCount}`);
    console.log(`   ⚠️  No matching files: ${couriers.length - updateCount - skipCount}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Function to verify current state
async function verifyCurrentState() {
  console.log('\n🔍 Verifying current courier logo state...');
  
  try {
    const { data: couriers, error } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    console.log('\n📊 Current logo data status:');
    
    let urlCount = 0;
    let dataCount = 0;
    let nullCount = 0;
    
    couriers.forEach(courier => {
      let status;
      if (!courier.logo_data) {
        status = '❌ No logo';
        nullCount++;
      } else if (courier.logo_data.startsWith('http')) {
        status = `✅ URL: ${courier.logo_data.substring(0, 40)}...`;
        urlCount++;
      } else {
        status = `⚠️  Data: ${typeof courier.logo_data} (${courier.logo_data.length} chars)`;
        dataCount++;
      }
      
      console.log(`   ${courier.code.padEnd(15)} ${status}`);
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`   URLs: ${urlCount}`);
    console.log(`   Legacy data: ${dataCount}`);
    console.log(`   No logo: ${nullCount}`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--list')) {
    await listCourierLogos();
  } else if (args.includes('--verify')) {
    await verifyCurrentState();
  } else {
    await verifyCurrentState();
    await updateCourierLogos();
    await verifyCurrentState();
  }
}

if (require.main === module) {
  main();
}

module.exports = { listCourierLogos, updateCourierLogos, verifyCurrentState };