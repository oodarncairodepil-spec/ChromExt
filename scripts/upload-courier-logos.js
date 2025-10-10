const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PLASMO_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Mapping of courier codes to logo filenames (based on database setup and available files)
const courierLogoMapping = {
  'jne': 'jne.png',
  'jnt': 'j&t.png',
  'anteraja': 'anteraja.png',
  'lion': 'lion.png',
  'paxel': 'paxel.png',
  'posindonesia': 'pos.png',
  'sicepat': 'sicepat-express.png',
  'ninja': 'ninja.png',
  'sentral_cargo': 'sentralcargo.png',
  'sap': 'sap.png',
  'tiki': 'tiki.png',
  'id_express': 'idexpress.png',
  // Additional logos available in the folder
  'dhl': 'dhl.png',
  'gosend': 'gosend.png',
  'grab': 'grab.png',
  'rayspeed': 'rayspeed.png',
  'wahana': 'wahana.png'
};

async function uploadCourierLogos() {
  try {
    console.log('Starting courier logo upload process...');
    
    const logoDir = path.join(__dirname, '..', 'test-files', 'couriers logo');
    
    // Check if logo directory exists
    if (!fs.existsSync(logoDir)) {
      console.error(`Logo directory not found: ${logoDir}`);
      return;
    }
    
    console.log(`Reading logos from: ${logoDir}`);
    
    for (const [courierCode, filename] of Object.entries(courierLogoMapping)) {
      const logoPath = path.join(logoDir, filename);
      
      if (fs.existsSync(logoPath)) {
        console.log(`Processing ${courierCode}: ${filename}`);
        
        // Read the image file and convert to base64
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = logoBuffer.toString('base64');
        const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${logoBase64}`;
        
        // Try to update with logo_data column first, fallback to logo_url if column doesn't exist
        let { error } = await supabase
          .from('shipping_couriers')
          .update({ logo_data: logoBuffer })
          .eq('code', courierCode);
        
        // If logo_data column doesn't exist, try logo_url with base64 data
        if (error && error.message.includes('column "logo_data" does not exist')) {
          console.log(`logo_data column not found, using logo_url for ${courierCode}`);
          const { error: urlError } = await supabase
            .from('shipping_couriers')
            .update({ logo_url: dataUrl })
            .eq('code', courierCode);
          error = urlError;
        }
        
        if (error) {
          console.error(`Error updating ${courierCode}:`, error);
        } else {
          console.log(`✓ Successfully uploaded logo for ${courierCode}`);
        }
      } else {
        console.warn(`Logo file not found: ${logoPath}`);
      }
    }
    
    console.log('\nCourier logo upload process completed!');
    
    // Verify the uploads
    const { data: couriers, error } = await supabase
      .from('shipping_couriers')
      .select('code, name, logo_data')
      .order('name');
    
    if (error) {
      console.error('Error verifying uploads:', error);
    } else {
      console.log('\nVerification results:');
      couriers.forEach(courier => {
        const status = courier.logo_data ? '✓ Has logo (binary)' : '✗ No logo';
        console.log(`${courier.code} (${courier.name}): ${status}`);
      });
    }
    
  } catch (error) {
    console.error('Error in upload process:', error);
  }
}

// Run the upload process
uploadCourierLogos();