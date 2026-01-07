const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCourierPreferences() {
  try {
    console.log('=== Debugging Courier Preferences ===\n');

    // Get all shipping couriers
    const { data: couriers, error: couriersError } = await supabase
      .from('shipping_couriers')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (couriersError) {
      console.error('Error fetching couriers:', couriersError);
      return;
    }

    console.log(`Found ${couriers?.length || 0} active couriers`);

    // Get all user courier preferences
    const { data: courierPrefs, error: courierPrefsError } = await supabase
      .from('user_courier_preferences')
      .select('*')
      .order('courier_id');

    if (courierPrefsError) {
      console.error('Error fetching courier preferences:', courierPrefsError);
      return;
    }

    console.log(`Found ${courierPrefs?.length || 0} courier preferences\n`);

    // Check for null/undefined values in courier preferences
    console.log('=== Checking Courier Preferences for Null/Undefined Values ===');
    let nullPrefsCount = 0;
    let invalidPrefsCount = 0;

    if (courierPrefs) {
      courierPrefs.forEach((pref, index) => {
        if (!pref) {
          console.log(`❌ Preference at index ${index} is null/undefined`);
          nullPrefsCount++;
          return;
        }

        const issues = [];
        if (!pref.id) issues.push('missing id');
        if (!pref.user_id) issues.push('missing user_id');
        if (!pref.courier_id) issues.push('missing courier_id');
        if (typeof pref.is_enabled !== 'boolean') issues.push('invalid is_enabled');

        if (issues.length > 0) {
          console.log(`❌ Invalid preference at index ${index}:`, {
            id: pref.id,
            user_id: pref.user_id,
            courier_id: pref.courier_id,
            is_enabled: pref.is_enabled,
            issues: issues
          });
          invalidPrefsCount++;
        }
      });
    }

    console.log(`\nNull preferences: ${nullPrefsCount}`);
    console.log(`Invalid preferences: ${invalidPrefsCount}`);

    // Check for couriers without preferences
    console.log('\n=== Checking Couriers Without Preferences ===');
    if (couriers && courierPrefs) {
      const courierIds = new Set(couriers.map(c => c.id));
      const prefCourierIds = new Set(courierPrefs.filter(p => p && p.courier_id).map(p => p.courier_id));
      
      const couriersWithoutPrefs = couriers.filter(c => !prefCourierIds.has(c.id));
      
      if (couriersWithoutPrefs.length > 0) {
        console.log(`Found ${couriersWithoutPrefs.length} couriers without preferences:`);
        couriersWithoutPrefs.forEach(courier => {
          console.log(`  - ${courier.name} (ID: ${courier.id})`);
        });
      } else {
        console.log('✅ All couriers have preferences');
      }
    }

    // Check for orphaned preferences
    console.log('\n=== Checking for Orphaned Preferences ===');
    if (couriers && courierPrefs) {
      const courierIds = new Set(couriers.map(c => c.id));
      const orphanedPrefs = courierPrefs.filter(p => p && p.courier_id && !courierIds.has(p.courier_id));
      
      if (orphanedPrefs.length > 0) {
        console.log(`Found ${orphanedPrefs.length} orphaned preferences:`);
        orphanedPrefs.forEach(pref => {
          console.log(`  - Preference ID: ${pref.id}, Courier ID: ${pref.courier_id}`);
        });
      } else {
        console.log('✅ No orphaned preferences found');
      }
    }

    // Test getCourierPreference logic simulation
    console.log('\n=== Simulating getCourierPreference Logic ===');
    if (couriers && courierPrefs) {
      console.log('Testing first 5 couriers:');
      couriers.slice(0, 5).forEach(courier => {
        console.log(`\nTesting courier: ${courier.name} (${courier.id})`);
        
        const pref = courierPrefs.find(p => {
          if (!p) {
            console.log('  ❌ Found null/undefined preference in array');
            return false;
          }
          if (!p.courier_id) {
            console.log('  ❌ Found preference with null/undefined courier_id:', p);
            return false;
          }
          return p.courier_id === courier.id;
        });
        
        const result = pref?.is_enabled ?? true;
        console.log(`  Result: ${result} (preference found: ${!!pref})`);
      });
    }

    console.log('\n=== Debug Complete ===');

  } catch (error) {
    console.error('Error during debugging:', error);
  }
}

debugCourierPreferences();