import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

import { requireDb } from "@/lib/db";
import { adminUsers, settings } from "@/db/schema";

async function main() {
  const db = requireDb();

  // Ensure gen_random_uuid() exists for UUID defaults.
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  const defaultSettings: Array<{ key: string; value: string }> = [
    { key: "price_team_cents", value: "50000" }, // $500.00
    { key: "price_banner_cents", value: "25000" }, // $250.00
    { key: "price_both_cents", value: "70000" }, // $700.00
    { key: "season_year", value: "2025" },
    { key: "contact_email", value: "info@geringgirlssoftball.org" },
    { key: "org_name", value: "Gering Girls Softball Association" },
  ];

  for (const s of defaultSettings) {
    await db
      .insert(settings)
      .values({ key: s.key, value: s.value })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: s.value, updated_at: sql`now()` },
      });
  }

  const seedEmail = process.env.ADMIN_SEED_EMAIL;
  const seedPassword = process.env.ADMIN_SEED_PASSWORD;
  const seedName = process.env.ADMIN_SEED_NAME;

  if (!seedEmail || !seedPassword || !seedName) {
    // eslint-disable-next-line no-console
    console.warn("ADMIN_SEED_* not fully set; skipping admin user seed.");
    return;
  }

  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const existing = await db.select().from(adminUsers).where(eq(adminUsers.email, seedEmail));
  if (existing.length > 0) {
    await db
      .update(adminUsers)
      .set({ password_hash: passwordHash, name: seedName, role: "admin" })
      .where(eq(adminUsers.email, seedEmail));
    // eslint-disable-next-line no-console
    console.log(`Admin user ${seedEmail} updated.`);
    return;
  }

  await db.insert(adminUsers).values({
    email: seedEmail,
    password_hash: passwordHash,
    name: seedName,
    role: "admin",
  });
}

main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Seed completed.");
    process.exit(0);
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });

