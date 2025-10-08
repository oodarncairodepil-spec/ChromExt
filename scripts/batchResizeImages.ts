import { createClient } from '@supabase/supabase-js'
import { formatFileSize } from '../src/utils/imageCompression'
import { compressImageBuffer } from './nodeImageCompression'
import fs from 'fs'
import path from 'path'

// Simple image file validation
function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

// Load environment variables
require('dotenv').config()

const supabaseUrl = process.env.PLASMO_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:')
  console.error('- PLASMO_PUBLIC_SUPABASE_URL')
  console.error('- PLASMO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create admin client for storage operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface ImageRecord {
  id: string
  product_id: string
  image_url: string
  is_primary: boolean
  created_at: string
}

interface ProcessingResult {
  success: number
  failed: number
  skipped: number
  errors: string[]
}

// Function to download image from URL
async function downloadImage(url: string): Promise<File | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Extract filename from URL
    const urlParts = url.split('/')
    const filename = urlParts[urlParts.length - 1] || 'image.jpg'
    
    // Create File object
    const file = new File([buffer], filename, {
      type: response.headers.get('content-type') || 'image/jpeg'
    })
    
    return file
  } catch (error) {
    console.error('Error downloading image:', error)
    return null
  }
}

// Function to extract storage path from public URL
function extractStoragePath(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl)
    const pathParts = url.pathname.split('/')
    
    // Find the bucket name and extract the path after it
    const bucketIndex = pathParts.findIndex(part => part === 'products' || part === 'quick-reply-images')
    if (bucketIndex === -1) return null
    
    const bucket = pathParts[bucketIndex]
    const filePath = pathParts.slice(bucketIndex + 1).join('/')
    
    return filePath
  } catch (error) {
    console.error('Error extracting storage path:', error)
    return null
  }
}

// Function to get bucket name from URL
function getBucketFromUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl)
    const pathParts = url.pathname.split('/')
    
    // Find the bucket name
    const bucketIndex = pathParts.findIndex(part => part === 'products' || part === 'quick-reply-images')
    if (bucketIndex === -1) return null
    
    return pathParts[bucketIndex]
  } catch (error) {
    console.error('Error extracting bucket name:', error)
    return null
  }
}

// Function to process a single image
async function processImage(imageRecord: ImageRecord): Promise<{ success: boolean; error?: string; originalSize?: number; compressedSize?: number }> {
  try {
    console.log(`Processing image: ${imageRecord.image_url}`)
    
    // Download the original image
    const originalFile = await downloadImage(imageRecord.image_url)
    if (!originalFile) {
      return { success: false, error: 'Failed to download image' }
    }
    
    // Check if it's a valid image file
    if (!isImageFile(originalFile)) {
      return { success: false, error: 'Not a valid image file' }
    }
    
    const originalSize = originalFile.size
    
    // Skip if already under 300KB
    if (originalSize < 300 * 1024) {
      console.log(`Skipping ${imageRecord.image_url} - already under 300KB (${formatFileSize(originalSize)})`)
      return { success: true, originalSize, compressedSize: originalSize }
    }
    
    console.log(`Compressing image: ${formatFileSize(originalSize)} -> target: <300KB`)
    
    // Convert File to Buffer for Sharp processing
    const arrayBuffer = await originalFile.arrayBuffer()
    const imageBuffer = Buffer.from(arrayBuffer)
    
    // Compress the image using Sharp
    const compressedBuffer = await compressImageBuffer(imageBuffer, {
      maxSizeKB: 300,
      maxWidth: 1200,
      maxHeight: 630,
      quality: 80,
      format: 'jpeg'
    })
    
    const compressedSize = compressedBuffer.length
    console.log(`Compressed to: ${formatFileSize(compressedSize)} (${Math.round(((originalSize - compressedSize) / originalSize) * 100)}% reduction)`)
    
    // Extract storage path and bucket
    const storagePath = extractStoragePath(imageRecord.image_url)
    const bucket = getBucketFromUrl(imageRecord.image_url)
    
    if (!storagePath || !bucket) {
      return { success: false, error: 'Could not extract storage path or bucket from URL' }
    }
    
    // Upload compressed image to replace the original
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .update(storagePath, compressedBuffer, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg'
      })
    
    if (uploadError) {
      console.error('Upload error:', uploadError)
      return { success: false, error: `Upload failed: ${uploadError.message}` }
    }
    
    console.log(`✅ Successfully processed: ${imageRecord.image_url}`)
    return { success: true, originalSize, compressedSize }
    
  } catch (error) {
    console.error('Error processing image:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Main function to batch resize all images
async function batchResizeImages(): Promise<void> {
  console.log('🚀 Starting batch image resize process...')
  
  const result: ProcessingResult = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: []
  }
  
  let totalOriginalSize = 0
  let totalCompressedSize = 0
  
  try {
    // Fetch all product images from the database
    console.log('📋 Fetching all product images...')
    const { data: images, error } = await supabaseAdmin
      .from('product_images')
      .select('id, product_id, image_url, is_primary, created_at')
      .order('created_at', { ascending: true })
    
    if (error) {
      throw new Error(`Failed to fetch images: ${error.message}`)
    }
    
    if (!images || images.length === 0) {
      console.log('ℹ️ No images found in the database')
      return
    }
    
    console.log(`📊 Found ${images.length} images to process`)
    
    // Process images in batches to avoid overwhelming the system
    const batchSize = 5
    for (let i = 0; i < images.length; i += batchSize) {
      const batch = images.slice(i, i + batchSize)
      console.log(`\n🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(images.length / batchSize)} (${batch.length} images)`)
      
      // Process batch in parallel
      const batchPromises = batch.map(image => processImage(image))
      const batchResults = await Promise.all(batchPromises)
      
      // Aggregate results
      for (const batchResult of batchResults) {
        if (batchResult.success) {
          if (batchResult.originalSize === batchResult.compressedSize) {
            result.skipped++
          } else {
            result.success++
          }
          
          if (batchResult.originalSize) totalOriginalSize += batchResult.originalSize
          if (batchResult.compressedSize) totalCompressedSize += batchResult.compressedSize
        } else {
          result.failed++
          if (batchResult.error) {
            result.errors.push(batchResult.error)
          }
        }
      }
      
      // Add a small delay between batches to be gentle on the system
      if (i + batchSize < images.length) {
        console.log('⏳ Waiting 2 seconds before next batch...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
  } catch (error) {
    console.error('❌ Fatal error during batch processing:', error)
    throw error
  }
  
  // Print final results
  console.log('\n📊 Batch Resize Results:')
  console.log('========================')
  console.log(`✅ Successfully compressed: ${result.success}`)
  console.log(`⏭️ Skipped (already <300KB): ${result.skipped}`)
  console.log(`❌ Failed: ${result.failed}`)
  console.log(`📁 Total images processed: ${result.success + result.skipped + result.failed}`)
  
  if (totalOriginalSize > 0 && totalCompressedSize > 0) {
    const totalReduction = Math.round(((totalOriginalSize - totalCompressedSize) / totalOriginalSize) * 100)
    console.log(`💾 Total size reduction: ${formatFileSize(totalOriginalSize)} -> ${formatFileSize(totalCompressedSize)} (${totalReduction}% reduction)`)
  }
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors encountered:')
    result.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`)
    })
  }
  
  console.log('\n🎉 Batch resize process completed!')
}

// Run the script
if (require.main === module) {
  batchResizeImages()
    .then(() => {
      console.log('✅ Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Script failed:', error)
      process.exit(1)
    })
}

export { batchResizeImages }