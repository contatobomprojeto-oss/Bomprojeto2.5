/**
 * Utility to resolve public customer tracking portal URLs.
 * Ensures external clients never receive private dev URLs with cookie checks.
 */

export function getPublicPortalBaseUrl(): string {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // In AI Studio preview environment, ais-dev- requires developer login/cookies.
    // ais-pre- is the public Shared App URL that anyone can access without credentials!
    if (origin && origin.includes('ais-dev-')) {
      return origin.replace('ais-dev-', 'ais-pre-');
    }
    if (origin && (origin.includes('ais-pre-') || origin.includes('run.app'))) {
      return origin;
    }

    // Check custom domain saved in settings
    if (typeof localStorage !== 'undefined') {
      const savedUser = localStorage.getItem('bomprojeto_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed.customPortalDomain && parsed.customPortalDomain.trim()) {
          const custom = parsed.customPortalDomain.trim().replace(/\/+$/, '');
          if (custom.startsWith('http://') || custom.startsWith('https://')) {
            return custom;
          }
          return `https://${custom}`;
        }
      }
    }

    return origin || 'https://ais-pre-mfyo7ab4kaxz6m3oi2m4fh-485829572863.us-west1.run.app';
  } catch {
    return 'https://ais-pre-mfyo7ab4kaxz6m3oi2m4fh-485829572863.us-west1.run.app';
  }
}

export function buildClientPortalUrl(projectId: string): string {
  const base = getPublicPortalBaseUrl();
  return `${base}/acompanhar/${projectId}`;
}
