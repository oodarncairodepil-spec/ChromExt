#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
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

async function checkCurrentState() {
  console.log('🚀 Checking current logo_data column state...');
  
  try {
    // Check current couriers and their logo data
    const { data: couriers, error } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .order('name');
    
    if (error) {
      throw error;
    }
    
    console.log('\n📊 Current courier data:');
    couriers.forEach(courier => {
      const logoStatus = courier.logo_data 
        ? (typeof courier.logo_data === 'string' && courier.logo_data.startsWith('http') 
           ? `URL: ${courier.logo_data.substring(0, 50)}...`
           : `Data type: ${typeof courier.logo_data}, Length: ${courier.logo_data?.length || 0}`)
        : 'No logo';
      
      console.log(`   ${courier.code}: ${courier.name} - ${logoStatus}`);
    });
    
    // Check if any couriers have bytea data (will show as object/buffer)
    const hasLegacyData = couriers.some(c => 
      c.logo_data && typeof c.logo_data !== 'string'
    );
    
    if (hasLegacyData) {
      console.log('\n⚠️  Found legacy bytea data that needs migration.');
      console.log('\n📋 Migration steps needed:');
      console.log('   1. The logo_data column currently contains bytea data');
      console.log('   2. We need to change it to TEXT and migrate existing data');
      console.log('   3. Run the SQL migration manually in your Supabase dashboard');
      
      console.log('\n📄 SQL Migration Script:');
      console.log('   File: database/migrate-logo-data-to-text.sql');
      console.log('   This script will safely migrate your data.');
    } else {
      console.log('\n✅ All logo data appears to be in text format already.');
      console.log('   No migration needed.');
    }
    
  } catch (error) {
    console.error('❌ Error checking current state:', error.message);
    
    if (error.message.includes('column "logo_data" does not exist')) {
      console.log('\n📋 The logo_data column does not exist yet.');
      console.log('   Please run: database/add-courier-logo-column.sql first');
      console.log('   Then run this script again to check the migration status.');
    }
    
    process.exit(1);
  }
}

async function performSimpleMigration() {
  console.log('\n🔧 Attempting simple migration...');
  
  try {
    // This is a simplified approach - just add a new text column if needed
    console.log('\n⚠️  For safety, please perform the migration manually:');
    console.log('\n1. Open your Supabase SQL Editor');
    console.log('2. Run the contents of: database/migrate-logo-data-to-text.sql');
    console.log('3. This will safely backup and migrate your data');
    console.log('\nReason: Column type changes require careful handling to avoid data loss.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Main execution
async function main() {
  await checkCurrentState();
  await performSimpleMigration();
}

if (require.main === module) {
  main();
}

module.exports = { checkCurrentState, performSimpleMigration };