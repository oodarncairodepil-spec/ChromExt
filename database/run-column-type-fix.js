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

async function checkCurrentColumnType() {
  console.log('🔍 Checking current column type...');
  
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = 'shipping_couriers' 
            AND column_name = 'logo_data'
        `
      });
    
    if (error) {
      console.log('⚠️ Cannot query column info directly, checking sample data...');
      
      // Get sample data to understand current state
      const { data: sampleData, error: sampleError } = await supabase
        .from('shipping_couriers')
        .select('code, logo_data')
        .not('logo_data', 'is', null)
        .limit(1);
      
      if (sampleError) throw sampleError;
      
      if (sampleData && sampleData.length > 0) {
        const sample = sampleData[0];
        console.log(`📊 Sample data from ${sample.code}:`);
        console.log(`   🔤 Type: ${typeof sample.logo_data}`);
        console.log(`   📏 Length: ${sample.logo_data.length}`);
        console.log(`   📝 First 50 chars: "${sample.logo_data.substring(0, 50)}"`);
        
        if (sample.logo_data.startsWith('\\x')) {
          console.log('   ❌ Data appears to be hex-encoded (likely bytea column)');
          return 'bytea';
        } else if (sample.logo_data.startsWith('http')) {
          console.log('   ✅ Data appears to be plain URL (likely text column)');
          return 'text';
        } else {
          console.log('   ⚠️ Data format unclear');
          return 'unknown';
        }
      }
    } else {
      console.log('📊 Column information:');
      console.log(data);
      return data[0]?.data_type || 'unknown';
    }
  } catch (error) {
    console.error('❌ Failed to check column type:', error.message);
    return 'error';
  }
}

async function changeColumnType() {
  console.log('🔧 Changing column type from bytea to text...');
  
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: 'ALTER TABLE shipping_couriers ALTER COLUMN logo_data TYPE text;'
      });
    
    if (error) {
      console.error('❌ Failed to change column type:', error.message);
      return false;
    }
    
    console.log('✅ Column type changed successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to change column type:', error.message);
    return false;
  }
}

async function updateColumnComment() {
  console.log('📝 Updating column comment...');
  
  try {
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: "COMMENT ON COLUMN shipping_couriers.logo_data IS 'Courier logo image URL or path';"
      });
    
    if (error) {
      console.log('⚠️ Failed to update comment (non-critical):', error.message);
    } else {
      console.log('✅ Column comment updated');
    }
  } catch (error) {
    console.log('⚠️ Failed to update comment (non-critical):', error.message);
  }
}

async function verifyColumnChange() {
  console.log('🔍 Verifying column type change...');
  
  try {
    // Get sample data to verify the change
    const { data: sampleData, error } = await supabase
      .from('shipping_couriers')
      .select('code, logo_data')
      .not('logo_data', 'is', null)
      .limit(3);
    
    if (error) throw error;
    
    console.log('📊 Sample data after column type change:');
    
    sampleData.forEach(courier => {
      console.log(`\n🏢 ${courier.code}:`);
      console.log(`   🔤 Type: ${typeof courier.logo_data}`);
      console.log(`   📏 Length: ${courier.logo_data.length}`);
      console.log(`   📝 Content: "${courier.logo_data}"`);
      
      if (courier.logo_data.startsWith('\\x')) {
        console.log('   ❌ Still hex-encoded');
      } else if (courier.logo_data.startsWith('http')) {
        console.log('   ✅ Plain URL');
      } else {
        console.log('   ⚠️ Unknown format');
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to verify column change:', error.message);
  }
}

async function fixColumnType() {
  console.log('🚀 Starting column type fix process...');
  
  try {
    // Step 1: Check current column type
    const currentType = await checkCurrentColumnType();
    console.log(`\n📊 Current column type appears to be: ${currentType}`);
    
    if (currentType === 'text') {
      console.log('✅ Column is already text type');
    } else if (currentType === 'bytea' || currentType === 'unknown') {
      console.log('🔧 Column needs to be changed to text type');
      
      // Step 2: Change column type
      const success = await changeColumnType();
      
      if (!success) {
        console.error('❌ Failed to change column type');
        return;
      }
      
      // Step 3: Update column comment
      await updateColumnComment();
    }
    
    // Step 4: Verify the change
    await verifyColumnChange();
    
    console.log('\n🎉 Column type fix process completed!');
    console.log('\n📋 Next steps:');
    console.log('   1. The column is now text type');
    console.log('   2. Existing hex data will be readable as text');
    console.log('   3. You can now decode the hex strings to plain URLs');
    console.log('   4. New data can be stored as plain text URLs');
    
  } catch (error) {
    console.error('❌ Column type fix failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  fixColumnType();
}

module.exports = { fixColumnType, checkCurrentColumnType, changeColumnType };