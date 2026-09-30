import DOMPurify from 'dompurify';

/**
 * Validates a URL to prevent javascript: XSS attacks.
 * Only allows http:, https:, mailto:, and tel: protocols.
 */
export const isSafeUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  // Protocol-relative URLs (//host, and the /\host form browsers also accept)
  // navigate off-site, so they are not same-origin relative paths.
  if (/^\/[/\\]/.test(url)) return false;
  // Allow relative URLs or anchors
  if (url.startsWith('/') || url.startsWith('#')) return true;
  
  try {
    const parsed = new URL(url);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    // If it can't be parsed as a URL and doesn't start with / or #
    return false;
  }
};

/**
 * Sanitizes HTML to prevent XSS attacks while allowing safe tags used by Tiptap.
 */
export const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'ul', 'ol', 'li', 'br', 'span'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
  });
};

/**
 * Migrates legacy plain text / markdown formats to HTML
 * for use in Tiptap editor and Viewer rendering.
 */
export const migrateLegacyTextToHtml = (text: string): string => {
  if (!text) return '';
  
  // If it already contains HTML tags (like Tiptap's output with attributes), return as is
  if (/^\s*<(p|ul|ol|h[1-6]|div|blockquote)(>|\s+[^>]*>)/i.test(text)) {
    return text;
  }

  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  const lines = html.split('\n');
  const processedLines: string[] = [];
  
  let inList = false;

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${trimmed.replace(/^[•-]\s*/, '')}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (trimmed !== '') {
        processedLines.push(`<p>${line}</p>`);
      }
    }
  });

  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('');
};
