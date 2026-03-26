import NextAuth from "next-auth";
import { NextRequest } from "next/server";

import { authOptions } from "@/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { jsonError, getClientIp } from "@/lib/api";

const handler = NextAuth(authOptions);

async function rateLimitedPOST(req: NextRequest, ctx: unknown) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({
    key: `admin-login:${ip}`,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
  });
  if (!rl.allowed) {
    return jsonError("Too many login attempts. Try again later.", 429, "RATE_LIMITED");
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (handler as Function)(req, ctx);
}

export { handler as GET, rateLimitedPOST as POST };
