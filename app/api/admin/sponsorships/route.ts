import { NextResponse } from "next/server";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { jsonError } from "@/lib/api";
import { getAdminServerSession } from "@/auth";
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

