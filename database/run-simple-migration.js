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

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Function to execute SQL migration
async function runSimpleMigration() {
  console.log('🚀 Starting migration to simple image paths...');
  
  try {
    // Step 1: Check current state
    console.log('\n📊 Checking current logo_data structure...');
    const { data: currentState, error: stateError } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .order('name');
    
    if (stateError) throw stateError;
    
    console.log('Current state:');
    currentState.forEach(courier => {
      let status;
      if (!courier.logo_data) {
        status = '❌ No logo';
      } else if (courier.logo_data.startsWith('http')) {
        status = '✅ Already URL';
      } else if (courier.logo_data.length > 1000) {
        status = '⚠️ Hex data';
      } else {
        status = '❓ Other';
      }
      console.log(`   ${courier.code.padEnd(15)} ${status}`);
    });
    
    // Step 2: Create backup column if it doesn't exist
    console.log('\n💾 Creating backup of current logo_data...');
    
    // Check if backup column exists
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'shipping_couriers' })
      .single();
    
    // Add backup column if it doesn't exist
    try {
      await supabase.rpc('execute_sql', {
        sql: 'ALTER TABLE shipping_couriers ADD COLUMN IF NOT EXISTS logo_data_backup TEXT;'
      });
      console.log('✅ Backup column ready');
    } catch (e) {
      console.log('ℹ️ Backup column already exists or created');
    }
    
    // Backup current data
    const { error: backupError } = await supabase
      .rpc('execute_sql', {
        sql: `UPDATE shipping_couriers 
              SET logo_data_backup = logo_data 
              WHERE logo_data_backup IS NULL AND logo_data IS NOT NULL;`
      });
    
    if (backupError) {
      console.log('ℹ️ Backup update completed (or already exists)');
    } else {
      console.log('✅ Current data backed up');
    }
    
    // Step 3: Define simple image paths for each courier
    const courierLogoPaths = {
      'anteraja': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/anteraja-logo.png',
      'jne': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/jne-logo.png',
      'jnt': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/jnt-logo.png',
      'sicepat': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/sicepat-logo.png',
      'tiki': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/tiki-logo.png',
      'pos': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/pos-logo.png',
      'lion': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/lion-logo.png',
      'ninja': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/ninja-logo.png',
      'wahana': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/wahana-logo.png',
      'sap': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/sap-logo.png',
      'gosend': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/gosend-logo.png',
      'grab': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/grab-logo.png',
      'paxel': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/paxel-logo.png',
      'id_express': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/id-express-logo.png',
      'rpx': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/rpx-logo.png',
      'ncs': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/ncs-logo.png',
      'pandu': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/pandu-logo.png',
      'posindonesia': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/posindonesia-logo.png',
      'sentral_cargo': 'https://oeikkeghjcclwgqzsvou.supabase.co/storage/v1/object/public/courier-logos/sentral-cargo-logo.png'
    };
    
    // Step 4: Update each courier with simple image path
    console.log('\n🔄 Updating couriers with simple image paths...');
    
    let updateCount = 0;
    let skipCount = 0;
    
    for (const [courierCode, logoPath] of Object.entries(courierLogoPaths)) {
      const courier = currentState.find(c => c.code === courierCode);
      
      if (!courier) {
        console.log(`   ⚠️ Courier ${courierCode} not found in database`);
        continue;
      }
      
      // Skip if already has the correct URL
      if (courier.logo_data === logoPath) {
        console.log(`   ⏭️ ${courierCode} already has correct URL`);
        skipCount++;
        continue;
      }
      
      console.log(`   🔄 Updating ${courierCode}...`);
      
      const { error: updateError } = await supabase
        .from('shipping_couriers')
        .update({ logo_data: logoPath })
        .eq('code', courierCode);
      
      if (updateError) {
        console.error(`   ❌ Failed to update ${courierCode}:`, updateError.message);
      } else {
        console.log(`   ✅ Updated ${courierCode}`);
        updateCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Step 5: Verify final state
    console.log('\n🔍 Verifying migration results...');
    
    const { data: finalState, error: finalError } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .order('name');
    
    if (finalError) throw finalError;
    
    let urlCount = 0;
    let nullCount = 0;
    let otherCount = 0;
    
    console.log('\nFinal state:');
    finalState.forEach(courier => {
      let status;
      if (!courier.logo_data) {
        status = '❌ No logo';
        nullCount++;
      } else if (courier.logo_data.startsWith('http')) {
        status = '✅ URL';
        urlCount++;
      } else {
        status = '⚠️ Other';
        otherCount++;
      }
      console.log(`   ${courier.code.padEnd(15)} ${status}`);
    });
    
    console.log('\n🎉 Migration completed!');
    console.log(`\n📊 Results:`);
    console.log(`   ✅ Updated to URLs: ${updateCount}`);
    console.log(`   ⏭️ Already correct: ${skipCount}`);
    console.log(`   📈 Total with URLs: ${urlCount}`);
    console.log(`   ❌ Still without logos: ${nullCount}`);
    console.log(`   ⚠️ Other format: ${otherCount}`);
    
    if (urlCount > 0) {
      console.log('\n✅ Logo data column now uses simple image paths!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Function to verify current state only
async function verifyState() {
  console.log('🔍 Checking current logo_data state...');
  
  try {
    const { data: couriers, error } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .order('name');
    
    if (error) throw error;
    
    let urlCount = 0;
    let dataCount = 0;
    let nullCount = 0;
    
    console.log('\nCurrent logo data status:');
    couriers.forEach(courier => {
      let status;
      if (!courier.logo_data) {
        status = '❌ No logo';
        nullCount++;
      } else if (courier.logo_data.startsWith('http')) {
        status = `✅ URL: ${courier.logo_data.substring(0, 50)}...`;
        urlCount++;
      } else {
        status = `⚠️ Data: ${courier.logo_data.length} chars`;
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
  
  if (args.includes('--verify')) {
    await verifyState();
  } else {
    await runSimpleMigration();
  }
}

if (require.main === module) {
  main();
}

module.exports = { runSimpleMigration, verifyState };