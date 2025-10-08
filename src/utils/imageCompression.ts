/**
 * Image compression utility for WhatsApp compatibility
 * Compresses images to under 300KB while maintaining quality
 */

export interface CompressionOptions {
  maxSizeKB?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxSizeKB: 300,
  maxWidth: 1200,
  maxHeight: 630,
  quality: 0.8,
  format: 'image/jpeg'
};

/**
 * Compresses an image file to meet WhatsApp's requirements
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise<File> - The compressed image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  // If file is already small enough, return as is
  if (file.size <= opts.maxSizeKB * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      const { width, height } = calculateDimensions(
        img.width,
        img.height,
        opts.maxWidth,
        opts.maxHeight
      );

      canvas.width = width;
      canvas.height = height;

      // Draw and compress the image
      ctx.drawImage(img, 0, 0, width, height);
      
      // Try different quality levels to get under the size limit
      compressWithQuality(canvas, opts, file.name)
        .then(resolve)
        .catch(reject);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = { width: originalWidth, height: originalHeight };

  // Scale down if too large
  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Compress canvas with different quality levels until under size limit
 */
async function compressWithQuality(
  canvas: HTMLCanvasElement,
  options: Required<CompressionOptions>,
  originalName: string
): Promise<File> {
  let quality = options.quality;
  const minQuality = 0.1;
  const qualityStep = 0.1;

  while (quality >= minQuality) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, options.format, quality);
    });

    if (!blob) {
      throw new Error('Failed to create blob from canvas');
    }

    // Check if size is acceptable
    if (blob.size <= options.maxSizeKB * 1024) {
      const extension = getFileExtension(options.format);
      const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
      const compressedName = `${nameWithoutExt}_compressed.${extension}`;
      
      return new File([blob], compressedName, {
        type: options.format,
        lastModified: Date.now()
      });
    }

    // Reduce quality and try again
    quality -= qualityStep;
  }

  // If we can't get under the limit, return the smallest version
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, options.format, minQuality);
  });

  if (!blob) {
    throw new Error('Failed to create final compressed blob');
  }

  const extension = getFileExtension(options.format);
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const compressedName = `${nameWithoutExt}_compressed.${extension}`;
  
  return new File([blob], compressedName, {
    type: options.format,
    lastModified: Date.now()
  });
}

/**
 * Get file extension from MIME type
 */
function getFileExtension(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
}

/**
 * Validate if file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Compress multiple images in batch
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {},
  onProgress?: (completed: number, total: number) => void
): Promise<File[]> {
  const compressedFiles: File[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (isImageFile(file)) {
      try {
        const compressed = await compressImage(file, options);
        compressedFiles.push(compressed);
      } catch (error) {
        console.error(`Failed to compress ${file.name}:`, error);
        // Keep original file if compression fails
        compressedFiles.push(file);
      }
    } else {
      // Keep non-image files as is
      compressedFiles.push(file);
    }
    
    onProgress?.(i + 1, files.length);
  }
  
  return compressedFiles;
}