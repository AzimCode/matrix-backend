export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';

/** Coarse device bucketing from User-Agent — enough for analytics, no fingerprinting library needed. */
export function detectDevice(userAgent: string | undefined): DeviceCategory {
  if (!userAgent) {
    return 'desktop';
  }
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) {
    return 'tablet';
  }
  if (/mobi|iphone|ipod|android.*mobile/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

export function extractReferrerHost(referrer: string | undefined): string | undefined {
  if (!referrer) {
    return undefined;
  }
  try {
    return new URL(referrer).hostname;
  } catch {
    return undefined;
  }
}
