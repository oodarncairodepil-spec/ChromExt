#!/usr/bin/env node

/**
 * Batch Image Compression Script
 * 
 * This script finds all large images in Supabase storage and compresses them
 * to under 300KB for WhatsApp compatibility.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { compressImageBuffer } = require('./nodeImageCompression');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY; // Need service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- PLASMO_PUBLIC_SUPABASE_URL');
  console.error('- PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Download image from URL
 */
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(buffer);
      });
    }).on('error', reject);
  });
}

/**
 * Convert buffer to File object for compression
 */
function bufferToFile(buffer, filename, mimeType) {
  const blob = new Blob([buffer], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

/**
 * Get file size from URL
 */
function getFileSize(url) {
  return new Promise((resolve, reject) => {
    https.request(url, { method: 'HEAD' }, (response) => {
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        resolve(parseInt(contentLength, 10));
      } else {
        reject(new Error('Content-Length header not found'));
      }
    }).on('error', reject).end();
  });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Main compression function
 */
async function compressExistingImages() {
  console.log('🔍 Scanning for images to compress...');
  
  try {
    // Get all product images from the database
    const { data: productImages, error: imagesError } = await supabase
      .from('product_images')
      .select('*');
    
    if (imagesError) {
      console.error('Error fetching product images:', imagesError);
      return;
    }
    
    // Also get images from products table (legacy)
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, image')
      .not('image', 'is', null);
    
    if (productsError) {
      console.error('Error fetching products:', productsError);
      return;
    }
    
    const allImages = [];
    
    // Add product_images
    if (productImages) {
      productImages.forEach(img => {
        allImages.push({
          type: 'product_image',
          id: img.id,
          product_id: img.product_id,
          url: img.image_url,
          is_primary: img.is_primary
        });
      });
    }
    
    // Add legacy product images
    if (products) {
      products.forEach(product => {
        if (product.image && product.image.startsWith('http')) {
          allImages.push({
            type: 'product_legacy',
            id: product.id,
            product_id: product.id,
            url: product.image,
            is_primary: true
          });
        }
      });
    }
    
    console.log(`📊 Found ${allImages.length} images to check`);
    
    let compressedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const image of allImages) {
      try {
        console.log(`\n🔍 Checking: ${image.url}`);
        
        // Check file size
        const fileSize = await getFileSize(image.url);
        console.log(`📏 Current size: ${formatFileSize(fileSize)}`);
        
        // Skip if already under 300KB
        if (fileSize <= 300 * 1024) {
          console.log('✅ Already optimized, skipping');
          skippedCount++;
          continue;
        }
        
        console.log('🔄 Compressing...');
        
        // Download the image
        const imageBuffer = await downloadImage(image.url);
        
        // Determine MIME type from URL
        const urlPath = new URL(image.url).pathname;
        const ext = path.extname(urlPath).toLowerCase();
        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.webp') mimeType = 'image/webp';
        
        // Compress the image buffer directly using Sharp
        const compressedBuffer = await compressImageBuffer(imageBuffer, {
          maxSizeKB: 300,
          maxWidth: 1200,
          maxHeight: 630,
          quality: 80,
          format: 'jpeg'
        });
        
        console.log(`📉 Compressed to: ${formatFileSize(compressedBuffer.length)}`);
        
        // Upload compressed image
        const fileName = `compressed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
        const filePath = `${image.product_id}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('products')
          .upload(filePath, compressedBuffer, {
            contentType: 'image/jpeg',
            upsert: false
          });
        
        if (uploadError) {
          console.error('❌ Upload error:', uploadError);
          errorCount++;
          continue;
        }
        
        // Get the new URL
        const { data: urlData } = supabase.storage
          .from('products')
          .getPublicUrl(filePath);
        
        const newUrl = urlData.publicUrl;
        
        // Update database
        if (image.type === 'product_image') {
          const { error: updateError } = await supabase
            .from('product_images')
            .update({ image_url: newUrl })
            .eq('id', image.id);
          
          if (updateError) {
            console.error('❌ Database update error:', updateError);
            errorCount++;
            continue;
          }
        } else if (image.type === 'product_legacy') {
          const { error: updateError } = await supabase
            .from('products')
            .update({ image: newUrl })
            .eq('id', image.id);
          
          if (updateError) {
            console.error('❌ Database update error:', updateError);
            errorCount++;
            continue;
          }
        }
        
        console.log('✅ Successfully compressed and updated');
        compressedCount++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Error processing ${image.url}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Compression Summary:');
    console.log(`✅ Compressed: ${compressedCount}`);
    console.log(`⏭️  Skipped (already optimized): ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total processed: ${allImages.length}`);
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Run the script
if (require.main === module) {
  compressExistingImages()
    .then(() => {
      console.log('\n🎉 Batch compression completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { compressExistingImages };