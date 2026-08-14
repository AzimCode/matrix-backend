import { extname } from 'path';

/** Strips directory components and unsafe characters, keeping the result safe for display and storage-key composition. */
export function sanitizeFilename(original: string): string {
  const base = original.split(/[/\\]/).pop() ?? 'file';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
  return cleaned.length > 0 ? cleaned : 'file';
}

export function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/svg+xml':
      return '.svg';
    case 'application/pdf':
      return '.pdf';
    default:
      return extname(mimeType) || '';
  }
}
