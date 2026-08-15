import { StorageService } from './storage.service';
import { AppConfigService } from '../../config/app-config.service';

function makeService(s3: Record<string, unknown>) {
  return new StorageService({ s3 } as unknown as AppConfigService);
}

describe('StorageService.publicUrl', () => {
  const base = {
    endpoint: 'https://abc123.r2.cloudflarestorage.com',
    region: 'auto',
    bucket: 'matrix-portfolio',
    accessKey: 'key',
    secretKey: 'secret',
    forcePathStyle: true,
  };

  it('uses S3_PUBLIC_URL when set, because R2 does not serve objects from the API host', () => {
    const service = makeService({ ...base, publicUrl: 'https://pub-abc123.r2.dev' });

    expect(service.publicUrl('media/photo.png')).toBe('https://pub-abc123.r2.dev/media/photo.png');
  });

  it('does not double up slashes when the public URL has a trailing one', () => {
    const service = makeService({ ...base, publicUrl: 'https://pub-abc123.r2.dev/' });

    expect(service.publicUrl('media/photo.png')).toBe('https://pub-abc123.r2.dev/media/photo.png');
  });

  it('falls back to the path-style API host (MinIO) when no public URL is configured', () => {
    const service = makeService({ ...base, publicUrl: undefined, endpoint: 'http://minio:9000' });

    expect(service.publicUrl('media/photo.png')).toBe(
      'http://minio:9000/matrix-portfolio/media/photo.png',
    );
  });

  it('falls back to a virtual-hosted host when path style is off', () => {
    const service = makeService({
      ...base,
      publicUrl: undefined,
      forcePathStyle: false,
      endpoint: 'https://s3.example.com',
    });

    expect(service.publicUrl('media/photo.png')).toBe(
      'https://matrix-portfolio.s3.example.com/media/photo.png',
    );
  });
});
