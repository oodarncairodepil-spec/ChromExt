/**
 * Formats phone numbers to standard format with country code
 * Handles various input formats:
 * - +6281259498653 (Indonesia)
 * - +82 10-5013-5653 (Korea)
 * - 081259498653 (Indonesia local)
 * - 62812 5949 8653
 * - 62812-5949-8653
 * - etc.
 */
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return ''
  
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, '')
  
  // IMPORTANT: Check for non-Indonesian country codes FIRST
  // This prevents adding "62" prefix to numbers that already have country codes like 82 (Korea)
  
  // Check for 1-digit country code (1 for US/Canada) - must be 11+ digits total
  if (cleaned.match(/^1\d{10,}$/)) {
    return cleaned
  }
  
  // Check for 2-digit country codes (20-99) - must be 10+ digits total
  // Common non-Indonesian codes: 82 (Korea), 81 (Japan), 84 (Vietnam), 86 (China), etc.
  if (cleaned.length >= 10) {
    const twoDigitMatch = cleaned.match(/^([2-9][0-9])(\d{8,})$/)
    if (twoDigitMatch) {
      const countryCode = twoDigitMatch[1]
      const restOfNumber = twoDigitMatch[2]
      // If country code is NOT 62 (Indonesia) and has enough digits, it's a valid country code
      if (countryCode !== '62' && restOfNumber.length >= 8) {
        // Already has a country code (e.g., 82 for Korea), return as is
        return cleaned
      }
    }
  }
  
  // Handle Indonesian phone numbers (no country code yet)
  if (cleaned.startsWith('62')) {
    // Already has Indonesia country code
    return cleaned
  } else if (cleaned.startsWith('0')) {
    // Remove leading 0 and add Indonesia country code (62)
    return '62' + cleaned.substring(1)
  } else if (cleaned.startsWith('8') && cleaned.length >= 9 && cleaned.length <= 12) {
    // Indonesian mobile number starting with 8 (local format), add country code
    // This only applies if it didn't match a country code above (e.g., not 82, 81, 84, etc.)
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