// Test script to check environment variables in Chrome extension context
console.log('🔍 Environment Variables Test:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PLASMO_TARGET:', process.env.PLASMO_TARGET);
console.log('PLASMO_PUBLIC_SUPABASE_URL:', process.env.PLASMO_PUBLIC_SUPABASE_URL ? 'Available' : 'Missing');
console.log('PLASMO_PUBLIC_SUPABASE_ANON_KEY:', process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY ? 'Available' : 'Missing');
console.log('PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY:', process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? 'Available' : 'Missing');

// Test Supabase client creation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Supabase Client Test:');
console.log('URL:', supabaseUrl);
console.log('Anon Key (first 20 chars):', supabaseAnonKey?.substring(0, 20));
console.log('Service Key (first 20 chars):', supabaseServiceKey?.substring(0, 20));

if (supabaseUrl && supabaseAnonKey) {
  const testClient = createClient(supabaseUrl, supabaseAnonKey);
  console.log('✅ Supabase client created successfully with anon key');
  
  // Test a simple query
  testClient.from('regencies').select('name').eq('id', '3671').single()
    .then(result => {
      console.log('🏙️ Test query result:', result);
    })
    .catch(error => {
      console.error('❌ Test query error:', error);
    });
} else {
  console.error('❌ Cannot create Supabase client - missing environment variables');
}