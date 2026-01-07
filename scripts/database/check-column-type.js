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

async function checkColumnType() {
  console.log('🔍 Checking shipping_couriers.logo_data column type...');
  
  try {
    // Check column information
    const { data: columns, error } = await supabase
      .rpc('get_column_info', {
        table_name: 'shipping_couriers',
        column_name: 'logo_data'
      });
    
    if (error) {
      console.log('RPC failed, trying direct query...');
      
      // Alternative query using information_schema
      const { data: columnInfo, error: infoError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_name', 'shipping_couriers')
        .eq('column_name', 'logo_data');
      
      if (infoError) {
        console.log('Information schema query failed, trying raw SQL...');
        
        // Raw SQL query
        const { data: rawResult, error: rawError } = await supabase
          .rpc('exec_sql', {
            query: `
              SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
              FROM information_schema.columns 
              WHERE table_name = 'shipping_couriers' 
                AND column_name = 'logo_data'
            `
          });
        
        if (rawError) {
          console.error('All queries failed. Trying direct table description...');
          
          // Try to get table structure
          const { data: tableData, error: tableError } = await supabase
            .from('shipping_couriers')
            .select('*')
            .limit(1);
          
          if (tableError) {
            throw new Error(`Cannot access table: ${tableError.message}`);
          }
          
          console.log('✅ Table accessible, but cannot determine column type programmatically');
          console.log('📊 Sample data from table:');
          
          if (tableData && tableData.length > 0) {
            const sample = tableData[0];
            console.log(`   🔤 logo_data type: ${typeof sample.logo_data}`);
            console.log(`   📏 logo_data length: ${sample.logo_data ? sample.logo_data.length : 0}`);
            
            if (sample.logo_data) {
              console.log(`   📝 First 100 chars: "${sample.logo_data.substring(0, 100)}"`);
            }
          }
          
          return;
        }
        
        console.log('📊 Column information (raw SQL):');
        console.log(rawResult);
      } else {
        console.log('📊 Column information (information_schema):');
        console.log(columnInfo);
      }
    } else {
      console.log('📊 Column information (RPC):');
      console.log(columns);
    }
    
    // Also test a direct update to see what happens
    console.log('\n🧪 Testing direct URL update...');
    
    const testUrl = 'https://example.com/test-logo.png';
    
    // Update one record with a test URL
    const { error: updateError } = await supabase
      .from('shipping_couriers')
      .update({ logo_data: testUrl })
      .eq('code', 'anteraja');
    
    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
    } else {
      console.log('✅ Update succeeded');
      
      // Immediately read it back
      const { data: readBack, error: readError } = await supabase
        .from('shipping_couriers')
        .select('logo_data')
        .eq('code', 'anteraja')
        .single();
      
      if (readError) {
        console.error('❌ Read back failed:', readError.message);
      } else {
        console.log('📖 Read back result:');
        console.log(`   📝 Content: "${readBack.logo_data}"`);
        console.log(`   📏 Length: ${readBack.logo_data.length}`);
        console.log(`   🔤 Type: ${typeof readBack.logo_data}`);
        
        if (readBack.logo_data === testUrl) {
          console.log('✅ Data stored as plain text!');
        } else if (readBack.logo_data.includes(testUrl)) {
          console.log('⚠️ Data contains the URL but with extra formatting');
        } else {
          console.log('❌ Data was transformed during storage');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
  }
}

if (require.main === module) {
  checkColumnType();
}

module.exports = { checkColumnType };