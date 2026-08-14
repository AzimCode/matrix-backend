import sanitizeHtml from 'sanitize-html';

/**
 * Strips all HTML/script content from user-supplied free text.
 * Used via @Transform() on DTO fields that accept rich user input
 * (contact messages, bios) to neutralize stored/reflected XSS.
 *
 * Uses `sanitize-html` (htmlparser2-based, pure CommonJS) rather than
 * DOMPurify/jsdom — jsdom's dependency tree pulls in several ESM-only
 * packages with no CJS build, which is fragile under a CommonJS build.
 */
export function sanitizePlainText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim();
}
