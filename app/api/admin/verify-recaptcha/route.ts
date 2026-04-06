import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, getClientIp } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyRecaptcha } from "@/lib/recaptcha";

const BodySchema = z.object({
  token: z.string().min(1),
  action: z.string().min(1),
});

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rl = checkRateLimit({ key: `verify-recaptcha:${ip}`, windowMs: 60_000, max: 20 });
  if (!rl.allowed) return jsonError("Too many requests", 429, "RATE_LIMITED");

  try {
    const body = BodySchema.parse(await req.json());
    const ok = await verifyRecaptcha(body.token);

    return NextResponse.json({ success: ok });
  } catch {
    return NextResponse.json({ success: false });
  }
}
