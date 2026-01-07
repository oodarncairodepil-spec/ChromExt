const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing required environment variables');
  console.error('Required: PLASMO_PUBLIC_SUPABASE_URL, PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY, PLASMO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

// Create service role client for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Create anonymous client for testing
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function fixComprehensiveRLS() {
  console.log('🔧 Starting comprehensive RLS fix...');
  
  try {
    // 1. Fix templates RLS - restrict to owner only
    console.log('\n📋 Fixing quick_reply_templates RLS...');
    
    // Enable RLS on templates
    const { error: enableRLSError } = await supabaseAdmin.rpc('exec_sql', {
      sql: 'ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;'
    });
    
    if (enableRLSError && !enableRLSError.message.includes('already exists')) {
      console.log('⚠️  Could not enable RLS via RPC, will provide SQL commands');
    } else {
      console.log('✅ RLS enabled for quick_reply_templates');
    }
    
    // Drop existing policies
    const dropPolicies = [
      'DROP POLICY IF EXISTS "Users can view their own templates" ON public.quick_reply_templates;',
      'DROP POLICY IF EXISTS "Users can insert their own templates" ON public.quick_reply_templates;',
      'DROP POLICY IF EXISTS "Users can update their own templates" ON public.quick_reply_templates;',
      'DROP POLICY IF EXISTS "Users can delete their own templates" ON public.quick_reply_templates;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON public.quick_reply_templates;',
      'DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.quick_reply_templates;',
      'DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.quick_reply_templates;',
      'DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.quick_reply_templates;'
    ];
    
    for (const sql of dropPolicies) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
      if (error && !error.message.includes('does not exist')) {
        console.log(`⚠️  Could not drop policy: ${error.message}`);
      }
    }
    
    // Create new restrictive policies for templates
    const templatePolicies = [
      'CREATE POLICY "Users can view their own templates" ON public.quick_reply_templates FOR SELECT USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can insert their own templates" ON public.quick_reply_templates FOR INSERT WITH CHECK (auth.uid() = user_id);',
      'CREATE POLICY "Users can update their own templates" ON public.quick_reply_templates FOR UPDATE USING (auth.uid() = user_id);',
      'CREATE POLICY "Users can delete their own templates" ON public.quick_reply_templates FOR DELETE USING (auth.uid() = user_id);'
    ];
    
    for (const sql of templatePolicies) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
      if (error) {
        console.log(`⚠️  Could not create policy: ${error.message}`);
      } else {
        console.log('✅ Created template policy');
      }
    }
    
    // 2. Fix courier services RLS - make globally accessible
    console.log('\n🚚 Fixing shipping_couriers and courier_services RLS...');
    
    // Enable RLS and create policies for shipping_couriers
    const courierRLSCommands = [
      'ALTER TABLE public.shipping_couriers ENABLE ROW LEVEL SECURITY;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON public.shipping_couriers;',
      'CREATE POLICY "Enable read access for all users" ON public.shipping_couriers FOR SELECT USING (true);'
    ];
    
    for (const sql of courierRLSCommands) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
      if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
        console.log(`⚠️  Courier RLS command failed: ${error.message}`);
      } else {
        console.log('✅ Applied courier RLS policy');
      }
    }
    
    // Enable RLS and create policies for courier_services
    const serviceRLSCommands = [
      'ALTER TABLE public.courier_services ENABLE ROW LEVEL SECURITY;',
      'DROP POLICY IF EXISTS "Enable read access for all users" ON public.courier_services;',
      'CREATE POLICY "Enable read access for all users" ON public.courier_services FOR SELECT USING (true);'
    ];
    
    for (const sql of serviceRLSCommands) {
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql });
      if (error && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
        console.log(`⚠️  Service RLS command failed: ${error.message}`);
      } else {
        console.log('✅ Applied service RLS policy');
      }
    }
    
    // 3. Test the fixes
    console.log('\n🧪 Testing RLS fixes...');
    
    // Test templates with anonymous client (should fail)
    console.log('Testing templates access with anonymous client...');
    const { data: anonTemplates, error: anonTemplatesError } = await supabaseAnon
      .from('quick_reply_templates')
      .select('*');
    
    if (anonTemplatesError || !anonTemplates || anonTemplates.length === 0) {
      console.log('✅ Templates RLS working - anonymous access blocked');
    } else {
      console.log(`❌ Templates RLS NOT working - found ${anonTemplates.length} templates with anonymous access`);
    }
    
    // Test couriers with anonymous client (should succeed)
    console.log('Testing couriers access with anonymous client...');
    const { data: anonCouriers, error: anonCouriersError } = await supabaseAnon
      .from('shipping_couriers')
      .select('*');
    
    if (anonCouriersError) {
      console.log(`❌ Couriers access blocked: ${anonCouriersError.message}`);
    } else {
      console.log(`✅ Couriers accessible - found ${anonCouriers?.length || 0} couriers`);
    }
    
    // Test courier services with anonymous client (should succeed)
    console.log('Testing courier services access with anonymous client...');
    const { data: anonServices, error: anonServicesError } = await supabaseAnon
      .from('courier_services')
      .select('*');
    
    if (anonServicesError) {
      console.log(`❌ Courier services access blocked: ${anonServicesError.message}`);
    } else {
      console.log(`✅ Courier services accessible - found ${anonServices?.length || 0} services`);
    }
    
  } catch (error) {
    console.error('❌ Error during RLS fix:', error);
    
    // Provide manual SQL commands as fallback
    console.log('\n📝 Manual SQL commands to execute in Supabase Dashboard:');
    console.log('\n-- Fix templates RLS (restrict to owner):');
    console.log('ALTER TABLE public.quick_reply_templates ENABLE ROW LEVEL SECURITY;');
    console.log('DROP POLICY IF EXISTS "Users can view their own templates" ON public.quick_reply_templates;');
    console.log('DROP POLICY IF EXISTS "Users can insert their own templates" ON public.quick_reply_templates;');
    console.log('DROP POLICY IF EXISTS "Users can update their own templates" ON public.quick_reply_templates;');
    console.log('DROP POLICY IF EXISTS "Users can delete their own templates" ON public.quick_reply_templates;');
    console.log('DROP POLICY IF EXISTS "Enable read access for all users" ON public.quick_reply_templates;');
    console.log('DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.quick_reply_templates;');
    console.log('DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.quick_reply_templates;');
    console.log('DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.quick_reply_templates;');
    console.log('CREATE POLICY "Users can view their own templates" ON public.quick_reply_templates FOR SELECT USING (auth.uid() = user_id);');
    console.log('CREATE POLICY "Users can insert their own templates" ON public.quick_reply_templates FOR INSERT WITH CHECK (auth.uid() = user_id);');
    console.log('CREATE POLICY "Users can update their own templates" ON public.quick_reply_templates FOR UPDATE USING (auth.uid() = user_id);');
    console.log('CREATE POLICY "Users can delete their own templates" ON public.quick_reply_templates FOR DELETE USING (auth.uid() = user_id);');
    
    console.log('\n-- Make couriers and services globally accessible:');
    console.log('ALTER TABLE public.shipping_couriers ENABLE ROW LEVEL SECURITY;');
    console.log('DROP POLICY IF EXISTS "Enable read access for all users" ON public.shipping_couriers;');
    console.log('CREATE POLICY "Enable read access for all users" ON public.shipping_couriers FOR SELECT USING (true);');
    console.log('ALTER TABLE public.courier_services ENABLE ROW LEVEL SECURITY;');
    console.log('DROP POLICY IF EXISTS "Enable read access for all users" ON public.courier_services;');
    console.log('CREATE POLICY "Enable read access for all users" ON public.courier_services FOR SELECT USING (true);');
  }
  
  console.log('\n🎯 Next steps:');
  console.log('1. If RLS commands failed, execute the manual SQL commands in Supabase Dashboard');
  console.log('2. Test template isolation - you should only see your own templates');
  console.log('3. Test courier services - you should see all available courier services');
  console.log('4. Run the verification script to confirm fixes');
}

fixComprehensiveRLS();