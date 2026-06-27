/**
 * Structured application logging helpers.
 * Security-sensitive events use securityLogger.ts (secrets redacted).
 */

export function appLog(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(meta ?? {}),
    })
  );
}
