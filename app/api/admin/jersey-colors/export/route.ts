import { desc, inArray } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { sponsorships } from "@/db/schema";
import { requireAdminRole } from "@/auth";
import { jsonError } from "@/lib/api";

export const dynamic = "force-dynamic";

function csvEscape(value: string | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const session = await requireAdminRole();
  if (!session) return jsonError("Forbidden", 403, "FORBIDDEN");

  const db = requireDb();
  const rows = await db
    .select({
      name: sponsorships.name,
      company: sponsorships.company,
      email: sponsorships.email,
      phone: sponsorships.phone,
      sponsorship_type: sponsorships.sponsorship_type,
      jersey_color_primary: sponsorships.jersey_color_primary,
      jersey_color_secondary: sponsorships.jersey_color_secondary,
      status: sponsorships.status,
      created_at: sponsorships.created_at,
    })
    .from(sponsorships)
    .where(inArray(sponsorships.sponsorship_type, ["team", "both"]))
    .orderBy(desc(sponsorships.created_at));

  const header = [
    "Name",
    "Company",
    "Email",
    "Phone",
    "Type",
    "Primary Color",
    "Secondary Color",
    "Status",
    "Date",
  ];

  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.name),
        csvEscape(r.company),
        csvEscape(r.email),
        csvEscape(r.phone),
        csvEscape(r.sponsorship_type),
        csvEscape(r.jersey_color_primary),
        csvEscape(r.jersey_color_secondary),
        csvEscape(r.status),
        csvEscape(new Date(r.created_at).toISOString()),
      ].join(",")
    );
  }

  const csv = lines.join("\r\n");
  const filename = `jersey-colors-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
