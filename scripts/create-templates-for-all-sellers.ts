import { createClient } from '@supabase/supabase-js';
import { createTemplatesForAllSellers } from '../src/lib/defaultTemplates';

// Initialize Supabase client
const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL || 'https://oeikkeghjcclwgqzsvou.supabase.co';
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NDU3MzEsImV4cCI6MjA3NDUyMTczMX0.IGtAWha8tmVBoyIMQPhLJhiG8HkUSv7qFM_WCqdWx5U';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🚀 Starting template creation for all sellers...');
  
  try {
    const result = await createTemplatesForAllSellers();
    
    console.log('✅ Template creation completed!');
    console.log(`📊 Results: ${result.success} successful, ${result.failed} failed`);
    
    if (result.failed > 0) {
      console.warn('⚠️  Some template creations failed. Check the logs above for details.');
      process.exit(1);
    } else {
      console.log('🎉 All templates created successfully!');
    }
  } catch (error) {
    console.error('❌ Error running template creation script:', error);
    process.exit(1);
  }
}

main();