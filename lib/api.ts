import { NextResponse } from "next/server";

export function jsonError(message: string, statusCode: number, code?: string) {
  return NextResponse.json({ error: message, code }, { status: statusCode });
}

const IP_RE = /^[\d.]+$|^[\da-fA-F:]+$/;

/**
 * Extract client IP from request headers.
 * Prefers X-Real-IP (set by nginx from $remote_addr, not spoofable)
 * then falls back to the first X-Forwarded-For entry.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp && IP_RE.test(realIp)) return realIp;

  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first && IP_RE.test(first)) return first;
  }

  return "unknown";
}

