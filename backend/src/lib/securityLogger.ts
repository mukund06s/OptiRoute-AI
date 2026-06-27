type SecurityEvent =
  | 'invalid_request'
  | 'validation_failed'
  | 'rate_limit_exceeded'
  | 'not_found'
  | 'internal_server_error'
  | 'authentication_failure';

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|authorization|api[_-]?key|cookie|credential|private/i;

function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map(sanitizeValue);
  }

  if (typeof value === 'object') {
    return sanitizeMeta(value as Record<string, unknown>);
  }

  return value;
}

export function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
}

export function securityLog(
  event: SecurityEvent,
  meta: Record<string, unknown> = {}
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'security',
    event,
    ...sanitizeMeta(meta),
  };

  console.log(JSON.stringify(entry));
}
