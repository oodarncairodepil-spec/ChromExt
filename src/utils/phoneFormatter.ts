/**
 * Formats phone numbers to Indonesian standard format: 6281259498653
 * Handles various input formats:
 * - +6281259498653
 * - 081259498653
 * - 62812 5949 8653
 * - 62812-5949-8653
 * - etc.
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return ''
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // Handle different cases
  if (cleaned.startsWith('62')) {
    // Already has country code
    return cleaned
  } else if (cleaned.startsWith('0')) {
    // Remove leading 0 and add country code
    return '62' + cleaned.substring(1)
  } else if (cleaned.startsWith('8')) {
    // Add country code directly
    return '62' + cleaned
  }
  
  // If it doesn't match expected patterns, return as is
  return cleaned
}

/**
 * Formats phone numbers to display format with spaces and dashes: +62 859-2104-6698
 */
export const formatPhoneNumberDisplay = (phone: string): string => {
  if (!phone) return ''
  
  // First normalize to clean format
  const cleaned = formatPhoneNumber(phone)
  
  // Format as +62 XXX-XXXX-XXXX
  if (cleaned.length >= 11 && cleaned.startsWith('62')) {
    const countryCode = cleaned.substring(0, 2)
    const firstPart = cleaned.substring(2, 5)
    const secondPart = cleaned.substring(5, 9)
    const thirdPart = cleaned.substring(9)
    
    return `+${countryCode} ${firstPart}-${secondPart}-${thirdPart}`
  }
  
  return cleaned
}

/**
 * Normalizes phone numbers for database queries - handles both formats
 */
export const normalizePhoneForQuery = (phone: string): string[] => {
  if (!phone) return []
  
  const cleanFormat = formatPhoneNumber(phone)
  const displayFormat = formatPhoneNumberDisplay(phone)
  
  // Return both formats for OR query
  return [cleanFormat, displayFormat]
}

/**
 * Validates if a phone number is in correct Indonesian format
 */
export const isValidIndonesianPhone = (phone: string): boolean => {
  const formatted = formatPhoneNumber(phone)
  // Indonesian mobile numbers typically start with 628 and are 10-13 digits long
  return /^628\d{8,10}$/.test(formatted)
}