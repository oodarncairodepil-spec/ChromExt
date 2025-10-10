const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create service role client for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Create anonymous client for testing
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function checkCourierServices() {
  console.log('🔍 Checking courier services data...');
  
  try {
    // Check with admin client
    console.log('\n📋 Checking with admin client:');
    const { data: adminCouriers, error: adminCouriersError } = await supabaseAdmin
      .from('shipping_couriers')
      .select('*');
    
    if (adminCouriersError) {
      console.log('❌ Admin couriers error:', adminCouriersError.message);
    } else {
      console.log(`✅ Admin found ${adminCouriers?.length || 0} couriers`);
    }
    
    const { data: adminServices, error: adminServicesError } = await supabaseAdmin
      .from('courier_services')
      .select('*');
    
    if (adminServicesError) {
      console.log('❌ Admin services error:', adminServicesError.message);
    } else {
      console.log(`✅ Admin found ${adminServices?.length || 0} courier services`);
      if (adminServices && adminServices.length > 0) {
        console.log('First few services:', adminServices.slice(0, 3));
      }
    }
    
    // Check with anonymous client
    console.log('\n🔓 Checking with anonymous client:');
    const { data: anonCouriers, error: anonCouriersError } = await supabaseAnon
      .from('shipping_couriers')
      .select('*');
    
    if (anonCouriersError) {
      console.log('❌ Anonymous couriers error:', anonCouriersError.message);
    } else {
      console.log(`✅ Anonymous found ${anonCouriers?.length || 0} couriers`);
    }
    
    const { data: anonServices, error: anonServicesError } = await supabaseAnon
      .from('courier_services')
      .select('*');
    
    if (anonServicesError) {
      console.log('❌ Anonymous services error:', anonServicesError.message);
    } else {
      console.log(`✅ Anonymous found ${anonServices?.length || 0} courier services`);
    }
    
    // Check RLS status
    console.log('\n🔒 Checking RLS status:');
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin
      .rpc('exec_sql', {
        sql: `
          SELECT 
            schemaname, 
            tablename, 
            rowsecurity 
          FROM pg_tables 
          WHERE tablename IN ('shipping_couriers', 'courier_services', 'quick_reply_templates')
          AND schemaname = 'public';
        `
      });
    
    if (rlsError) {
      console.log('❌ Could not check RLS status:', rlsError.message);
    } else {
      console.log('RLS Status:', rlsStatus);
    }
    
  } catch (error) {
    console.error('❌ Error checking courier services:', error);
  }
}

checkCourierServices();