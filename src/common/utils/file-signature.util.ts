/**
 * Sniffs a file's real type from its magic bytes / structure instead of
 * trusting the client-supplied MIME type or filename extension, which are
 * both trivially spoofable.
 */
export type DetectedFileType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml' | 'application/pdf';

export function detectFileType(buffer: Buffer): DetectedFileType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return 'application/pdf';
  }
  const head = buffer.subarray(0, 500).toString('utf8').trim().toLowerCase();
  if (head.startsWith('<?xml') || head.startsWith('<svg')) {
    if (head.includes('<svg')) {
      return 'image/svg+xml';
    }
  }
  return null;
}
