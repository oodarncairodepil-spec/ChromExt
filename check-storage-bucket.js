const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODk0NTczMSwiZXhwIjoyMDc0NTIxNzMxfQ.9fM4CXO609yeBePqUQyHNXgAPEw9yuyIHMB6ArR4XIQ';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkStorageBucket() {
  try {
    console.log('🔍 Checking courier-logos bucket contents...');
    
    // List all files in the courier-logos bucket
    const { data: files, error } = await supabase.storage
      .from('courier-logos')
      .list('', {
        limit: 100,
        offset: 0
      });
    
    if (error) {
      console.error('❌ Error listing files:', error);
      return;
    }
    
    console.log(`📁 Found ${files.length} files in courier-logos bucket:`);
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${file.metadata?.size || 'unknown size'})`);
    });
    
    // Check specific logo files that were returning 400 errors
    const problematicLogos = [
      'ncs-logo.png', 'rpx-logo.png', 'id-express-logo.png', 'pos-logo.png',
      'grab-logo.png', 'gosend-logo.png', 'lion-logo.png', 'tiki-logo.png',
      'sap-logo.png', 'sentral-cargo-logo.png', 'jne-logo.png', 'wahana-logo.png',
      'paxel-logo.png', 'posindonesia-logo.png'
    ];
    
    console.log('\n🔍 Checking problematic logo files:');
    const existingFiles = files.map(f => f.name);
    
    problematicLogos.forEach(logoName => {
      const exists = existingFiles.includes(logoName);
      console.log(`${exists ? '✅' : '❌'} ${logoName}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    // Get public URLs for existing files
    console.log('\n🔗 Public URLs for existing files:');
    files.slice(0, 5).forEach(file => {
      const { data } = supabase.storage
        .from('courier-logos')
        .getPublicUrl(file.name);
      console.log(`${file.name}: ${data.publicUrl}`);
    });
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
}

checkStorageBucket();