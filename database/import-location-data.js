#!/usr/bin/env node

// Import Indonesian location data (provinces, regencies, districts) into Supabase
// Usage: node import-location-data.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parse CSV file (no headers, just comma-separated values)
function parseCSV(filePath, columns) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  return lines.map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj = {};
    columns.forEach((column, index) => {
      obj[column] = values[index] || '';
    });
    return obj;
  });
}

// Import data with batch processing
async function importData(tableName, data, batchSize = 100) {
  console.log(`📊 Importing ${data.length} records into ${tableName}...`);
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    try {
      const { error } = await supabase
        .from(tableName)
        .upsert(batch, { onConflict: 'id' });
      
      if (error) {
        console.error(`❌ Error importing batch ${Math.floor(i/batchSize) + 1} to ${tableName}:`, error);
        throw error;
      }
      
      console.log(`✅ Imported batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(data.length/batchSize)} to ${tableName}`);
    } catch (err) {
      console.error(`❌ Failed to import batch to ${tableName}:`, err.message);
      throw err;
    }
  }
  
  console.log(`🎉 Successfully imported all ${data.length} records to ${tableName}`);
}

// Main import function
async function main() {
  try {
    console.log('🚀 Starting Indonesian location data import...');
    
    // File paths
    const docsDir = path.join(__dirname, '..', 'docs');
    const provincesFile = path.join(docsDir, 'provinces.csv');
    const regenciesFile = path.join(docsDir, 'regencies.csv');
    const districtsFile = path.join(docsDir, 'districts.csv');
    
    // Check if files exist
    if (!fs.existsSync(provincesFile)) {
      throw new Error(`Provinces file not found: ${provincesFile}`);
    }
    if (!fs.existsSync(regenciesFile)) {
      throw new Error(`Regencies file not found: ${regenciesFile}`);
    }
    if (!fs.existsSync(districtsFile)) {
      throw new Error(`Districts file not found: ${districtsFile}`);
    }
    
    // Parse CSV files
    console.log('📖 Parsing CSV files...');
    const provinces = parseCSV(provincesFile, ['id', 'name']);
    const regencies = parseCSV(regenciesFile, ['id', 'province_id', 'name']);
    const districts = parseCSV(districtsFile, ['id', 'regency_id', 'name']);
    
    console.log(`📋 Parsed data:`);
    console.log(`  - Provinces: ${provinces.length}`);
    console.log(`  - Regencies: ${regencies.length}`);
    console.log(`  - Districts: ${districts.length}`);
    
    // Import in order (provinces -> regencies -> districts)
    console.log('\n🔄 Starting data import...');
    
    // 1. Import provinces
    await importData('provinces', provinces.map(p => ({
      id: parseInt(p.id),
      name: p.name
    })));
    
    // 2. Import regencies
    await importData('regencies', regencies.map(r => ({
      id: parseInt(r.id),
      province_id: parseInt(r.province_id),
      name: r.name
    })));
    
    // 3. Import districts
    await importData('districts', districts.map(d => ({
      id: parseInt(d.id),
      regency_id: parseInt(d.regency_id),
      name: d.name
    })));
    
    // 4. Refresh materialized view
    console.log('\n🔄 Refreshing search materialized view...');
    const { error: refreshError } = await supabase.rpc('refresh_regions_search');
    
    if (refreshError) {
      console.warn('⚠️  Warning: Could not refresh materialized view:', refreshError.message);
      console.log('💡 You may need to run this manually in Supabase SQL editor:');
      console.log('   REFRESH MATERIALIZED VIEW regions_search_mv;');
    } else {
      console.log('✅ Materialized view refreshed successfully');
    }
    
    console.log('\n🎉 All location data imported successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Test the search API: SELECT * FROM api_regions_search(\'jakarta\', 5);');
    console.log('2. Integrate with your Cart component for location selection');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
if (require.main === module) {
  main();
}

module.exports = { main, parseCSV, importData };