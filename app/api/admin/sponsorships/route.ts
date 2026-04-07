import { NextResponse } from "next/server";
import { z } from "zod";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { getAdminServerSession, requireAdminRole } from "@/auth";
import { auditLog } from "@/lib/audit";
import { sponsorships } from "@/db/schema";

export async function GET(req: Request) {
  try {
    const session = await getAdminServerSession();
    if (!session) return jsonError("Unauthorized", 401, "UNAUTHORIZED");

    const db = requireDb();
    const url = new URL(req.url);

    const status = url.searchParams.get("status") ?? undefined;
    const type = url.searchParams.get("type") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;

    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1"));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? "20")));

    let where = status ? eq(sponsorships.status, status) : undefined;

    if (type) {
      where = where ? and(where, eq(sponsorships.sponsorship_type, type)) : eq(sponsorships.sponsorship_type, type);
    }

    if (search) {
      const q = `%${search}%`;
      const searchCondition = or(
        ilike(sponsorships.name, q),
        ilike(sponsorships.company, q),
        ilike(sponsorships.email, q),
        ilike(sponsorships.phone, q)
      );
      where = where ? and(where, searchCondition) : searchCondition;
    }

    const totalRows = where
      ? await db.select({ count: count() }).from(sponsorships).where(where)
      : await db.select({ count: count() }).from(sponsorships);

    const total = totalRows[0]?.count ?? 0;

    const items = where
      ? await db
          .select()
          .from(sponsorships)
          .where(where)
          .orderBy(desc(sponsorships.created_at))
          .limit(limit)
          .offset((page - 1) * limit)
      : await db
          .select()
          .from(sponsorships)
          .orderBy(desc(sponsorships.created_at))
          .limit(limit)
          .offset((page - 1) * limit);

    return NextResponse.json({ items, page, limit, total }, { status: 200 });
  } catch (err) {
    console.error("Admin sponsorships read failed:", err);
    return NextResponse.json(
      { error: "Failed to load sponsorships", code: "ADMIN_SPONSORSHIPS_READ_FAILED" },
      { status: 500 }
    );
  }
}

const ManualSubmissionSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1).max(2),
  zip: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  sponsorship_type: z.enum(["team", "banner", "both"]),
  amount_paid_cents: z.number().int().min(0),
  payment_method_type: z.enum(["card", "us_bank_account", "check", "other"]),
  stripe_payment_status: z.enum(["pending", "succeeded"]).default("succeeded"),
  status: z.enum(["pending", "approved"]).default("approved"),
  jersey_color_primary: z.string().optional(),
  jersey_color_secondary: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdminRole();
    if (!session) return jsonError("Forbidden", 403, "FORBIDDEN");

    const db = requireDb();
    const body = ManualSubmissionSchema.parse(await req.json());

    const rows = await db
      .insert(sponsorships)
      .values({
        name: body.name,
        company: body.company || null,
        address: body.address,
        city: body.city,
        state: body.state.toUpperCase(),
        zip: body.zip,
        email: body.email,
        phone: body.phone,
        sponsorship_type: body.sponsorship_type,
        amount_paid_cents: body.amount_paid_cents,
        payment_method_type: body.payment_method_type,
        stripe_payment_status: body.stripe_payment_status,
        status: body.status,
        jersey_color_primary: body.jersey_color_primary || null,
        jersey_color_secondary: body.jersey_color_secondary || null,
        notes: body.notes
          ? JSON.stringify([{ text: body.notes, author: session.user?.name ?? session.user?.email ?? "Admin", timestamp: new Date().toISOString() }])
          : null,
      })
      .returning({ id: sponsorships.id });

    auditLog({
      event: "sponsorship_created_manual",
      actor: session.user?.email ?? "unknown",
      detail: { sponsorshipId: rows[0]?.id, name: body.name },
    });

    return NextResponse.json({ success: true, id: rows[0]?.id }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return jsonError(err.issues.map((e) => e.message).join(", "), 400, "VALIDATION_ERROR");
    }
    console.error("Admin manual submission failed:", err);
    return jsonError("Failed to create submission", 500, "ADMIN_SUBMISSION_CREATE_FAILED");
  }
}

