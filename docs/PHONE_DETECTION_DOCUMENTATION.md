# Phone Number Detection System - Comprehensive Documentation

## Overview

The phone number detection system automatically extracts phone numbers from WhatsApp Web when users click the "Auto Detect" button. This system uses a multi-layered approach to reliably detect phone numbers from the active chat, even when WhatsApp Web dynamically changes the DOM structure.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Detection Methods](#detection-methods)
3. [File Structure](#file-structure)
4. [Code Flow](#code-flow)
5. [Detection Logic Details](#detection-logic-details)
6. [Phone Number Formatting](#phone-number-formatting)
7. [Error Handling](#error-handling)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The phone detection system consists of three main components:

1. **Injected Script**: Executes in the WhatsApp Web page context to access DOM elements
2. **Detection Logic**: Multi-layered approach prioritizing visible text, then data-id attributes
3. **Phone Formatting**: Normalizes detected phone numbers to standard format

### Key Design Principles

- **Prioritize Visible Text**: Always try to extract from visible text first (most reliable)
- **Header-Focused**: Only check headers to avoid picking up phone numbers from other chats
- **Position-Based Fallback**: When visible text fails, use element position to prioritize candidates
- **Country Code Aware**: Handles multiple country codes (Indonesia: 62, Korea: 82, etc.)

---

## Detection Methods

The system uses a prioritized detection strategy:

### Priority 1: Visible Text Detection
- **Location**: Main chat header (`#main header`)
- **Selectors**: 
  - `[data-testid="selectable-text"]`
  - `.copyable-text`, `.selectable-text`
  - All elements containing phone-like patterns
- **Pattern Matching**: 
  - Text with 10+ digits
  - Contains `+` (country code indicator)
  - Contains `-` or spaces (phone formatting)
- **Advantages**: Most reliable, works when phone number is visible
- **Limitations**: Fails when WhatsApp hides phone number (e.g., when field already has value)

### Priority 2: Data-ID in Header
- **Location**: Main chat header elements with `[data-id]` attribute
- **Format Support**: 
  - `true_PHONENUMBER@c.us_MESSAGEID` (regular chat)
  - `true_PHONENUMBER@lid_ID` (some chats)
  - `false_PHONENUMBER@c.us_MESSAGEID` or `false_PHONENUMBER@lid_ID`
- **Regex**: `/(?:true_|false_)?(\d+)@(?:c\.us|lid_)/`
- **Advantages**: Works even when phone number is hidden
- **Limitations**: Requires data-id to be present in header

### Priority 3: Data-ID in Main Chat Area (Position-Based)
- **Location**: `#main` area, prioritized by position
- **Strategy**: 
  - Collect all data-ids with valid phone numbers
  - Prioritize elements in header
  - Sort by Y position (top to bottom)
  - Return first candidate
- **Advantages**: Fallback when header doesn't have data-id
- **Limitations**: May pick wrong number if multiple chats are visible

### Priority 4: Other Headers
- **Location**: Other header elements (not main chat header)
- **Use Case**: Edge cases where main header structure differs

---

## File Structure

### Core Files

#### 1. `src/pages/Cart.tsx`
- **Function**: `handleAutoDetectBuyer()`
- **Lines**: ~2097-2440
- **Purpose**: Auto-detect phone number for cart/checkout flow
- **Key Features**:
  - Injected script with comprehensive detection logic
  - Phone number formatting using `formatPhoneNumber()`
  - User lookup in database
  - Error handling with user-friendly dialogs

#### 2. `src/pages/Users.tsx`
- **Function**: `handleAutoDetect()`
- **Lines**: ~213-380
- **Purpose**: Auto-detect phone number for user search
- **Key Features**:
  - Same detection logic as Cart.tsx
  - Automatically populates search field
  - User lookup and registration dialog

#### 3. `src/utils/phoneFormatter.ts`
- **Functions**:
  - `formatPhoneNumber(phone: string): string`
  - `formatPhoneNumberDisplay(phone: string): string`
  - `normalizePhoneForQuery(phone: string): string[]`
  - `isValidIndonesianPhone(phone: string): boolean`
- **Purpose**: Phone number normalization and formatting
- **Key Features**:
  - Country code detection (prevents adding "62" to non-Indonesian numbers)
  - Supports multiple formats (with/without country code, with/without leading 0)
  - Query normalization for database searches

### Supporting Files

#### 4. `src/lib/supabase.ts`
- **Purpose**: Supabase client configuration
- **Relevance**: Used for user lookup queries

#### 5. `src/contexts/AuthContext.tsx`
- **Purpose**: User authentication context
- **Relevance**: Provides user data for database queries

---

## Code Flow

### Cart Page Flow (`handleAutoDetectBuyer`)

```
1. User clicks "Auto Detect" button
   ↓
2. Check Chrome APIs availability
   ↓
3. Query active tab
   ↓
4. Verify WhatsApp Web URL
   ↓
5. Execute injected script
   ↓
6. Detection Logic (in injected script):
   a. Try visible text detection
   b. If fails, try data-id in header
   c. If fails, try data-id in main chat (position-based)
   d. If fails, try other headers
   ↓
7. Process result:
   - Check for errors
   - Extract phone number
   - Format phone number
   - Lookup user in database
   - Show dialog with results
```

### Users Page Flow (`handleAutoDetect`)

```
1. User clicks "Auto Detect" button
   ↓
2. Check Chrome APIs availability
   ↓
3. Query active tab
   ↓
4. Execute injected script (same as Cart)
   ↓
5. Process result:
   - Extract phone number
   - Populate search field
   - Lookup user in database
   - Show appropriate dialog
```

---

## Detection Logic Details

### Injected Script Structure

The injected script runs in the WhatsApp Web page context and has access to the DOM:

```typescript
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  func: () => {
    // Detection logic here
    // Returns: { method, phone, originalText } or { error }
  }
})
```

### Visible Text Detection Algorithm

```typescript
1. Find main chat header:
   - #main header (priority)
   - [data-testid="chat-header"]
   - header[role="banner"]
   - header (fallback)

2. Collect text elements:
   - [data-testid="selectable-text"]
   - .copyable-text, .selectable-text
   - All elements with phone-like patterns
   - All span, div, p, h1-h6 elements

3. Prioritize elements:
   - Elements with copyable-text class (highest priority)
   - Elements with data-testid attribute
   - Other elements (lower priority)

4. Check each element:
   - Extract text content
   - Extract digits (remove non-digits)
   - Validate: 10+ digits
   - Pattern check: contains +, -, or phone-like formatting
   - Return first valid match
```

### Data-ID Extraction Algorithm

```typescript
1. Extract phone from data-id:
   - Pattern: /(?:true_|false_)?(\d+)@(?:c\.us|lid_)/
   - Captures: phone number digits
   - Handles: @c.us and @lid_ formats

2. Priority order:
   a. Main chat header [data-id]
   b. Other headers [data-id]
   c. Chat header [data-id]
   d. Main chat area [data-id] (position-based)

3. Position-based selection:
   - Collect all candidates
   - Filter: phone.length >= 10
   - Sort: inHeader first, then by Y position
   - Return: first candidate
```

### Phone Number Formatting Logic

```typescript
formatPhoneNumber(phone: string): string {
  1. Remove all non-digits
  2. Check for country codes:
     - 1-digit: 1 (US/Canada)
     - 2-digit: 20-99 (most countries)
     - If country code found and not 62: return as-is
  3. Handle Indonesian numbers:
     - Starts with 62: return as-is
     - Starts with 0: remove 0, add 62
     - Starts with 8: add 62 prefix
  4. Return formatted number
}
```

---

## Phone Number Formatting

### Supported Input Formats

- `+6281259498653` → `6281259498653`
- `+82 10-5013-5653` → `821050135653` (Korea, no 62 prefix added)
- `081259498653` → `6281259498653`
- `62812 5949 8653` → `6281259498653`
- `62812-5949-8653` → `6281259498653`

### Country Code Handling

The formatter recognizes common country codes and prevents incorrect prefix addition:

- **Indonesia (62)**: Adds prefix for local numbers (0xxx, 8xxx)
- **Korea (82)**: Preserves as-is (no 62 prefix)
- **Other countries**: Preserves as-is (no 62 prefix)

### Formatting Functions

#### `formatPhoneNumber(phone: string): string`
- Normalizes to digits-only format with country code
- Handles multiple country codes
- Returns: `"6281259498653"` or `"821050135653"`

#### `formatPhoneNumberDisplay(phone: string): string`
- Formats for display with spaces and dashes
- Returns: `"+62 812-5949-8653"`

#### `normalizePhoneForQuery(phone: string): string[]`
- Returns array of formats for database OR queries
- Returns: `["6281259498653", "+62 812-5949-8653"]`

---

## Error Handling

### Error Types

1. **Chrome API Unavailable**
   - Message: "Chrome extension APIs not available"
   - Solution: Ensure extension is running in Chrome

2. **No Active Tab**
   - Message: "No active tab found"
   - Solution: Ensure a tab is open

3. **Not WhatsApp Web**
   - Message: "Please open WhatsApp Web in the active tab"
   - Solution: Navigate to web.whatsapp.com

4. **No Phone Number Found**
   - Message: "Could not detect phone number from current chat"
   - Causes:
     - No active chat open
     - Phone number not visible in header
     - Group chat (no phone number)
   - Solution: Open an individual chat with phone number visible

5. **Script Execution Error**
   - Message: Error message from script
   - Solution: Check browser console for details

### Error Handling Flow

```typescript
try {
  // Detection logic
} catch (error) {
  return {
    error: error.message || 'Unknown error',
    stack: error.stack
  }
}

// In component:
if (result?.error) {
  // Show error dialog
  setShowErrorDialog(true)
}
```

---

## Troubleshooting

### Issue: Phone number not detected

**Symptoms**: Auto Detect returns "No phone number found"

**Possible Causes**:
1. No active chat open
2. Group chat (no individual phone number)
3. Phone number hidden by WhatsApp Web
4. DOM structure changed by WhatsApp update

**Solutions**:
1. Open an individual chat (not group)
2. Ensure phone number is visible in chat header
3. Try clicking on the chat header to reveal phone number
4. Check browser console for errors

### Issue: Wrong phone number detected

**Symptoms**: Detects phone number from different chat

**Possible Causes**:
1. Multiple chats visible in viewport
2. Data-id from wrong element selected

**Solutions**:
1. Ensure only one chat is active
2. Close other chat windows
3. Refresh WhatsApp Web page
4. The position-based fallback should prioritize header elements

### Issue: Phone number formatted incorrectly

**Symptoms**: Korea number gets "62" prefix (e.g., "62821050135653" instead of "821050135653")

**Possible Causes**:
1. Formatter not recognizing country code
2. Phone number format not matching expected patterns

**Solutions**:
1. Check `formatPhoneNumber()` logic
2. Verify country code detection regex
3. Ensure phone number starts with country code (e.g., "82" for Korea)

### Issue: Detection works when field is empty, fails when field has value

**Symptoms**: First detection works, second detection fails

**Possible Causes**:
1. WhatsApp Web hides phone number when field has value
2. DOM structure changes

**Solutions**:
1. The system now uses data-id fallback when visible text fails
2. Position-based selection ensures correct phone number is chosen
3. This should be automatically handled by the improved detection logic

---

## Code References

### Key Code Sections

#### Cart.tsx - Detection Function
- **Lines**: 2097-2440
- **Function**: `handleAutoDetectBuyer()`
- **Injected Script**: Lines 2116-2392

#### Users.tsx - Detection Function
- **Lines**: 213-380
- **Function**: `handleAutoDetect()`
- **Injected Script**: Lines 258-450 (approximate)

#### phoneFormatter.ts - Formatting Functions
- **Lines**: 11-60
- **Function**: `formatPhoneNumber()`
- **Country Code Detection**: Lines 17-43

### Important Regex Patterns

#### Data-ID Extraction
```typescript
/(?:true_|false_)?(\d+)@(?:c\.us|lid_)/
```
- Matches: `true_6287737622065@c.us_...`, `false_72323675762809@lid_...`
- Captures: Phone number digits

#### Phone Pattern Detection
```typescript
text.includes('+') || 
text.match(/[\d\s\-\(\)]{10,}/) || 
/^[\d\s\+\-\(\)]+$/.test(text) || 
digits.length >= 10
```
- Validates: Phone-like formatting

#### Country Code Detection
```typescript
/^([2-9][0-9])(\d{8,})$/
```
- Matches: 2-digit country codes (20-99)
- Validates: 8+ digits after country code

---

## Best Practices

### For Developers

1. **Always check for errors**: Handle both `result.error` and `result === null`
2. **Format phone numbers**: Always use `formatPhoneNumber()` before storing
3. **Use normalized queries**: Use `normalizePhoneForQuery()` for database searches
4. **Test with different formats**: Test with Indonesian, Korean, and other country codes
5. **Handle edge cases**: Group chats, hidden phone numbers, multiple chats

### For Maintenance

1. **Monitor WhatsApp Web updates**: DOM structure may change
2. **Test detection methods**: Verify all priority levels work
3. **Update regex if needed**: WhatsApp may change data-id format
4. **Keep formatter updated**: Add new country codes as needed

---

## Future Improvements

### Potential Enhancements

1. **Caching**: Cache detected phone number to avoid re-detection
2. **Multiple Format Support**: Support more phone number formats
3. **Group Chat Detection**: Detect group chat and show appropriate message
4. **Visual Feedback**: Show detection progress/status
5. **Fallback Methods**: Additional detection methods for edge cases

### Known Limitations

1. **WhatsApp Web Changes**: DOM structure may change with updates
2. **Group Chats**: Cannot detect individual phone numbers in groups
3. **Hidden Numbers**: Some privacy settings may hide phone numbers
4. **Multiple Chats**: May pick wrong number if multiple chats visible

---

## Version History

- **v2.0** (Current): Improved detection with position-based fallback, country code awareness
- **v1.0**: Initial implementation with basic data-id detection

---

## Related Documentation

- [COMPREHENSIVE_DOCUMENTATION.md](./COMPREHENSIVE_DOCUMENTATION.md) - Overall project documentation
- [BUILD_INSTRUCTIONS.md](../BUILD_INSTRUCTIONS.md) - Build and setup instructions

---

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in browser console
3. Test with different phone number formats
4. Verify WhatsApp Web is up to date

