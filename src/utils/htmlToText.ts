/**
 * Convert HTML content to plain text with proper formatting for WhatsApp
 * Handles Quill editor HTML format and converts to readable text
 * 
 * @param html - HTML string (may contain Quill editor markup)
 * @returns Plain text with proper line breaks
 */
export function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  // If the string doesn't contain HTML tags, return as-is (trimmed)
  if (!html.includes('<') && !html.includes('>')) {
    return html.trim()
  }

  try {
    // Create a temporary DOM element to parse HTML
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = html

    // Extract text content, which automatically:
    // - Strips all HTML tags
    // - Decodes HTML entities (&amp; → &, etc.)
    // - Preserves whitespace structure
    let text = tempDiv.textContent || tempDiv.innerText || ''

    // Post-process to handle paragraph breaks and formatting
    // Replace common block-level elements with newlines
    // First, let's handle <p> tags by converting them to newlines
    // Since textContent already stripped tags, we need to handle this differently
    
    // Alternative approach: Use innerHTML manipulation before extracting text
    // Replace <p> tags with newlines, <br> with newlines, etc.
    let processedHtml = html
      .replace(/<p[^>]*>/gi, '\n') // Replace opening <p> tags with newline
      .replace(/<\/p>/gi, '\n')     // Replace closing </p> tags with newline
      .replace(/<br\s*\/?>/gi, '\n') // Replace <br> tags with newline
      .replace(/<div[^>]*>/gi, '\n') // Replace opening <div> tags with newline
      .replace(/<\/div>/gi, '\n')    // Replace closing </div> tags with newline
      .replace(/<li[^>]*>/gi, '\n• ') // Replace <li> with newline and bullet
      .replace(/<\/li>/gi, '\n')     // Replace closing </li> with newline

    // Now parse the processed HTML to extract text and decode entities
    const tempDiv2 = document.createElement('div')
    tempDiv2.innerHTML = processedHtml
    text = tempDiv2.textContent || tempDiv2.innerText || ''

    // Clean up the text:
    // 1. Remove excessive whitespace (more than 2 consecutive newlines)
    text = text.replace(/\n{3,}/g, '\n\n')
    
    // 2. Remove leading/trailing newlines from each line
    text = text.split('\n').map(line => line.trim()).join('\n')
    
    // 3. Remove empty lines (but keep single blank lines between paragraphs)
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n')
    
    // 4. Trim leading and trailing whitespace
    text = text.trim()

    return text
  } catch (error) {
    // Fallback: Simple regex-based approach if DOM manipulation fails
    console.warn('HTML parsing failed, using regex fallback:', error)
    
    let text = html
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Replace block elements with newlines
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n• ')
      .replace(/<\/li>/gi, '\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim()

    return text
  }
}

