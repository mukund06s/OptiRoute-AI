/**
 * Validated public environment variables (browser-safe only).
 */

function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  const fallback = 'http://localhost:5000/api';
  const value = configured && configured.length > 0 ? configured : fallback;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('API URL must use http or https');
    }
    return value.replace(/\/$/, '');
  } catch {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_API_URL must be a valid absolute URL in production');
    }
    return fallback;
  }
}

export const publicEnv = {
  apiBaseUrl: resolveApiBaseUrl(),
  appName: process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'OptiRoute',
};
