/**
 * Node.js compatible image compression using Sharp
 * This replaces the browser-based canvas compression for batch scripts
 */

import sharp from 'sharp';

interface CompressionOptions {
  maxSizeKB?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Compress an image buffer to under 300KB using Sharp
 * @param imageBuffer - The image buffer to compress
 * @param options - Compression options
 * @returns The compressed image buffer
 */
export async function compressImageBuffer(imageBuffer: Buffer, options: CompressionOptions = {}): Promise<Buffer> {
  const {
    maxSizeKB = 300,
    maxWidth = 1200,
    maxHeight = 630,
    quality = 80,
    format = 'jpeg'
  } = options;

  const targetSizeBytes = maxSizeKB * 1024;

  try {
    // Get image metadata
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`Original image: ${metadata.width}x${metadata.height}, ${Math.round(imageBuffer.length / 1024)}KB`);

    // If already under target size, return as is
    if (imageBuffer.length <= targetSizeBytes) {
      console.log('Image already under target size, skipping compression');
      return imageBuffer;
    }

    // Start with the specified quality
    let currentQuality = quality;
    let compressedBuffer;

    // Try different quality levels until we get under the target size
    while (currentQuality >= 10) {
      let sharpInstance = sharp(imageBuffer)
        .resize({
          width: maxWidth,
          height: maxHeight,
          fit: 'inside',
          withoutEnlargement: true
        });

      // Apply format-specific compression
      if (format === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({ 
          quality: currentQuality,
          progressive: true,
          mozjpeg: true
        });
      } else if (format === 'png') {
        sharpInstance = sharpInstance.png({ 
          quality: currentQuality,
          compressionLevel: 9
        });
      } else if (format === 'webp') {
        sharpInstance = sharpInstance.webp({ 
          quality: currentQuality
        });
      }

      compressedBuffer = await sharpInstance.toBuffer();
      
      console.log(`Quality ${currentQuality}: ${Math.round(compressedBuffer.length / 1024)}KB`);

      // Check if we're under the target size
      if (compressedBuffer.length <= targetSizeBytes) {
        const reduction = Math.round(((imageBuffer.length - compressedBuffer.length) / imageBuffer.length) * 100);
        console.log(`✅ Compressed successfully: ${Math.round(compressedBuffer.length / 1024)}KB (${reduction}% reduction)`);
        return compressedBuffer;
      }

      // Reduce quality for next iteration
      currentQuality -= 10;
    }

    // If we still can't get under the limit, try more aggressive resizing
    console.log('Trying more aggressive resizing...');
    
    const aggressiveBuffer = await sharp(imageBuffer)
      .resize({
        width: Math.min(800, maxWidth),
        height: Math.min(420, maxHeight),
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 60,
        progressive: true,
        mozjpeg: true
      })
      .toBuffer();

    const reduction = Math.round(((imageBuffer.length - aggressiveBuffer.length) / imageBuffer.length) * 100);
    console.log(`⚠️ Aggressive compression: ${Math.round(aggressiveBuffer.length / 1024)}KB (${reduction}% reduction)`);
    
    return aggressiveBuffer;

  } catch (error) {
    console.error('Error compressing image:', error);
    throw error;
  }
}

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns Formatted size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}