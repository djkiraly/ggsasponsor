type AuditEvent = {
  event: string;
  actor?: string;
  ip?: string;
  detail?: Record<string, unknown>;
};

/**
 * Emit a structured audit log entry to stdout.
 * PM2 captures stdout to log files automatically.
 */
export function auditLog({ event, actor, ip, detail }: AuditEvent) {
  const entry = {
    _audit: true,
    ts: new Date().toISOString(),
    event,
    ...(actor && { actor }),
    ...(ip && { ip }),
    ...(detail && { detail }),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(entry));
}
