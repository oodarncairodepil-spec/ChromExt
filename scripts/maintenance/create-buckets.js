const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oeikkeghjcclwgqzsvou.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9laWtrZWdoamNjbHdncXpzdm91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NDU3MzEsImV4cCI6MjA3NDUyMTczMX0.IGtAWha8tmVBoyIMQPhLJhiG8HkUSv7qFM_WCqdWx5U';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createBuckets() {
  const buckets = ['products-images', 'quick-reply-images'];
  
  for (const bucketName of buckets) {
    try {
      console.log(`Creating bucket: ${bucketName}`);
      
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (error) {
        console.error(`Error creating bucket ${bucketName}:`, error);
      } else {
        console.log(`Successfully created bucket: ${bucketName}`);
      }
    } catch (err) {
      console.error(`Failed to create bucket ${bucketName}:`, err);
    }
  }
  
  // List buckets after creation
  console.log('\nListing all buckets:');
  const { data, error } = await supabase.storage.listBuckets();
  
  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    data.forEach(bucket => {
      console.log(`- ${bucket.name} (public: ${bucket.public})`);
    });
  }
}

createBuckets();